import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,        // 5 minutes before data is considered stale
            gcTime: 30 * 60 * 1000,          // 30 minutes before cached data is garbage collected
            refetchOnWindowFocus: false,      // Don't refetch when tab regains focus
            retry: 1,                         // Retry failed requests once
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </React.StrictMode>
);
