import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './registerSW'; registerServiceWorker();
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Watermark
if (typeof window !== 'undefined') {
  (window as any).__AUTHOR__ = "Phạm Thiên - 2X18";
  console.info("%c Phạm Thiên - 2X18 ", "color:transparent;font-size:1px;");
}

// AppProvider đã được bọc trong App.tsx → KHÔNG bọc lại ở đây
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
