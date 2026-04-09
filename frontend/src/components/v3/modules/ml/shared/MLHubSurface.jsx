import React from 'react';
import PropTypes from 'prop-types';
import { Badge, Button, Card, ControlBar, Grid, MetricCard, Select, Stack } from '../../../../../design-system';
import './MLHubSurface.css';

const toSelectOption = (option) => ({
    value: option.value,
    label: option.label,
});

export const MLHubHero = ({ badge, title, subtitle, actions }) => (
    <Card
        className="ml-surface__hero"
        title={
            <Stack gap="var(--space-sm)">
                {badge ? <Badge variant={badge.variant || 'primary'} size="sm">{badge.label}</Badge> : null}
                <span className="ml-surface__hero-title">{title}</span>
            </Stack>
        }
        subtitle={subtitle}
        extra={actions}
    />
);

export const MLHubFiltersBar = ({ filters = [], actions = null }) => (
    <ControlBar
        className="ml-surface__controlbar"
        left={
            <Grid columns={`repeat(${Math.max(filters.length, 1)}, minmax(180px, 1fr))`} gap="var(--space-sm)" className="ml-surface__filters-grid">
                {filters.map((filter) => (
                    <div key={filter.id} className="ml-surface__filter">
                        <label className="ml-surface__filter-label">{filter.label}</label>
                        <Select
                            options={(filter.options || []).map(toSelectOption)}
                            value={(filter.options || []).map(toSelectOption).find((option) => String(option.value) === String(filter.value)) || null}
                            onChange={(option) => filter.onChange?.(option?.value ?? '')}
                            isSearchable={filter.searchable ?? false}
                            placeholder={filter.placeholder || filter.label}
                        />
                    </div>
                ))}
            </Grid>
        }
        right={actions}
    />
);

export const MLHubMetricStrip = ({ metrics = [] }) => (
    <Grid columns={`repeat(${Math.max(Math.min(metrics.length, 4), 1)}, minmax(0, 1fr))`} gap="var(--space-md)" className="ml-surface__metrics">
        {metrics.map((metric) => (
            <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                subValue={metric.subValue}
                icon={metric.icon}
                variant={metric.featured ? 'featured' : 'default'}
                loading={metric.loading}
            />
        ))}
    </Grid>
);

export const MLHubSection = ({ title, subtitle, badge, actions, children, className = '' }) => (
    <Card
        className={`ml-surface__section ${className}`}
        title={<span className="ml-surface__section-title">{title}</span>}
        subtitle={subtitle}
        extra={
            <Stack row align="center" gap="var(--space-sm)">
                {badge ? <Badge variant={badge.variant || 'neutral'} size="sm">{badge.label}</Badge> : null}
                {actions}
            </Stack>
        }
    >
        {children}
    </Card>
);

export const MLHubEmptyState = ({ title, message, action }) => (
    <Card className="ml-surface__empty" ghost>
        <Stack gap="var(--space-sm)" align="center">
            <strong className="ml-surface__empty-title">{title}</strong>
            <p className="ml-surface__empty-message">{message}</p>
            {action ? <Button variant="ghost" onClick={action.onClick}>{action.label}</Button> : null}
        </Stack>
    </Card>
);

MLHubHero.propTypes = {
    badge: PropTypes.shape({
        label: PropTypes.string,
        variant: PropTypes.string,
    }),
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    actions: PropTypes.node,
};

MLHubFiltersBar.propTypes = {
    filters: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        value: PropTypes.any,
        onChange: PropTypes.func,
        options: PropTypes.arrayOf(PropTypes.shape({
            value: PropTypes.any,
            label: PropTypes.string,
        })),
        searchable: PropTypes.bool,
        placeholder: PropTypes.string,
    })),
    actions: PropTypes.node,
};

MLHubMetricStrip.propTypes = {
    metrics: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        subValue: PropTypes.string,
        icon: PropTypes.node,
        featured: PropTypes.bool,
        loading: PropTypes.bool,
    })),
};

MLHubSection.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    badge: PropTypes.shape({
        label: PropTypes.string,
        variant: PropTypes.string,
    }),
    actions: PropTypes.node,
    children: PropTypes.node,
    className: PropTypes.string,
};

MLHubEmptyState.propTypes = {
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    action: PropTypes.shape({
        label: PropTypes.string.isRequired,
        onClick: PropTypes.func.isRequired,
    }),
};
