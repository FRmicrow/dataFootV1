module.exports = function (fileInfo, api) {
    const j = api.jscodeshift;
    const root = j(fileInfo.source);
    let dirty = false;

    const makeEnclosingFunctionAsync = (path) => {
        let parentFunc = path.parent;
        while (parentFunc) {
            if (
                parentFunc.node.type === 'FunctionDeclaration' ||
                parentFunc.node.type === 'FunctionExpression' ||
                parentFunc.node.type === 'ArrowFunctionExpression' ||
                parentFunc.node.type === 'ObjectMethod' ||
                parentFunc.node.type === 'ClassMethod'
            ) {
                if (!parentFunc.node.async) {
                    parentFunc.node.async = true;
                    dirty = true;
                }
                break;
            }
            parentFunc = parentFunc.parent;
        }
    };

    // Make db.* calls async
    root.find(j.CallExpression, {
        callee: {
            type: 'MemberExpression',
            object: { name: 'db' },
            property: { name: (n) => ['get', 'all', 'run', 'query'].includes(n) }
        }
    }).forEach(path => {
        // if not already awaited and not returned directly
        if (path.parent.node.type !== 'AwaitExpression') {
            const awaitExpr = j.awaitExpression(path.node);
            path.replace(awaitExpr);
            makeEnclosingFunctionAsync(path);
            dirty = true;
        }
    });

    // Make DB.* calls async
    root.find(j.CallExpression, {
        callee: {
            type: 'MemberExpression',
            object: { name: 'DB' }
        }
    }).forEach(path => {
        const propName = path.node.callee.property.name;
        if (propName && (propName.startsWith('upsert') || propName.startsWith('getOrInsert') || propName.startsWith('get'))) {
            if (path.parent.node.type !== 'AwaitExpression') {
                const awaitExpr = j.awaitExpression(path.node);
                path.replace(awaitExpr);
                makeEnclosingFunctionAsync(path);
                dirty = true;
            }
        }
    });

    // Convert array.forEach(async () => {}) directly? Let's leave forEach as is, but it might create un-awaited promises.
    // Actually, `await Promise.all(arr.map(async () => {}))` is better. Let's do a simple heuristic:
    // Convert array.forEach(async (x) => ...) to for (const x of array) {...}
    root.find(j.CallExpression, {
        callee: {
            type: 'MemberExpression',
            property: { name: 'forEach' }
        }
    }).forEach(path => {
        const callback = path.node.arguments[0];
        if (callback && (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression') && callback.async) {
            // It's an async forEach callback! Convert to for...of loop
            const arrayExpr = path.node.callee.object;
            const param = callback.params[0] || j.identifier('_item');
            const body = callback.body;

            // Generate for...of
            let blockStatement = body;
            if (blockStatement.type !== 'BlockStatement') {
                blockStatement = j.blockStatement([j.expressionStatement(body)]);
            }

            const forOf = j.forOfStatement(
                j.variableDeclaration('const', [j.variableDeclarator(param, null)]),
                arrayExpr,
                blockStatement
            );

            path.parentPath.replace(forOf);
            makeEnclosingFunctionAsync(path.parentPath);
            dirty = true;
        }
    });

    return dirty ? root.toSource() : null;
};
