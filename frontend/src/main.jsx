import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import logo from './assets/zea-board-logo.png';
import './styles.css';

const openSansFontStack = '"Open Sans", Arial, Helvetica, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const openSansSimpleFontStack = '"Open Sans", Arial, Helvetica, ui-sans-serif, system-ui, sans-serif';

const apiBaseUrl =
  import.meta.env.VITE_API_URL ||
  (window.location.protocol !== 'https:' && import.meta.env.VITE_API_DOMAIN && import.meta.env.VITE_API_PORT
    ? `${import.meta.env.VITE_API_DOMAIN}:${import.meta.env.VITE_API_PORT}`
    : '');

const defaultCustomization = {
  appName: 'Zea Board',
  primaryColor: '#7c3aed',
  secondaryColor: '#22d3ee',
  accentColor: '#facc15',
  backgroundColor: '#f4f1ff',
  surfaceColor: '#ffffff',
  textColor: '#172033',
  fontFamily: openSansFontStack,
  sidepanelFontFamily: openSansSimpleFontStack,
  columnFontFamily: openSansSimpleFontStack,
  backgroundImageUrl: '',
  colorPalette: ['#7c3aed', '#a855f7', '#22d3ee', '#f97316', '#facc15']
};

const currencyOptions = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD'];
const invoiceStatusOptions = ['Draft', 'Sent', 'Paid', 'Void'];
const defaultInvoiceQuery = {
  search: '',
  status: '',
  currency: '',
  dateFrom: '',
  dateTo: '',
  datePreset: '',
  contactName: '',
  productName: '',
  discountType: '',
  subAccount: '',
  page: 1,
  limit: 25,
  sortBy: 'created_in_crm_on',
  sortDirection: 'desc'
};

const navItems = [
  { id: 'dashboard', label: 'Admin Dashboard', icon: 'dashboard' },
  { id: 'database', label: 'Database', icon: 'database' },
  { id: 'invoices', label: 'Invoices', icon: 'invoice' },
  { id: 'employee-management', label: 'Employee Management', icon: 'employees', group: 'Settings' },
  { id: 'user-management', label: 'User Management', icon: 'users', group: 'Settings' },
  { id: 'dashboard-editor', label: 'Dashboard Editor', icon: 'editor', group: 'Settings' },
  { id: 'customization', label: 'Customization', icon: 'palette', group: 'Settings' },
  { id: 'notifications', label: 'Notification Settings', icon: 'bell', group: 'Settings' },
  { id: 'api-webhooks', label: 'API Key & Webhook', icon: 'webhook', group: 'Settings' },
  { id: 'audit-logs', label: 'Audit Logs', icon: 'logs', group: 'Settings' }
];

const navPageIds = new Set(navItems.map((item) => item.id));
const settingsItems = navItems.filter((item) => item.group === 'Settings');
const settingsPageIds = new Set(settingsItems.map((item) => item.id));

const invoiceCardColorDefaults = {
  totalInvoices: '#3158a8',
  paidInvoices: '#287347',
  sentInvoices: '#208aa2',
  draftInvoices: '#d18b2f',
  voidInvoices: '#dc5f45',
  totalAmountPaid: '#2aa879',
  totalOutstanding: '#dc5f45',
  totalInvoiceValue: '#208aa2'
};

const dashboardWidgetFolders = [
  {
    id: 'elements',
    label: 'Elements',
    widgets: [
      { type: 'text', label: 'Text', defaultTitle: 'Text', defaultContent: 'Add a heading or paragraph...', color: '#ffffff' },
      { type: 'note', label: 'Notes', defaultTitle: 'Notes', defaultContent: 'Write your note here...', color: '#ffffff' },
      { type: 'info', label: 'Information Box', defaultTitle: 'Info Box', defaultContent: 'Important subaccount insight', color: '#ede9fe' },
      { type: 'image', label: 'Image', defaultTitle: 'Image', defaultContent: '', color: '#ffffff' },
      { type: 'divider', label: 'Divider', defaultTitle: 'Divider', defaultContent: '', color: '#7c3aed' }
    ]
  },
  {
    id: 'contacts',
    label: 'Contacts',
    widgets: [
      { type: 'contact-count', label: 'Contact Count (Numeric)', defaultTitle: 'Total Contacts', defaultContent: 'Total contacts for this subaccount', color: '#dbeafe' },
      { type: 'contact-count-by-tag', label: 'Contact Count by Tag (Numeric)', defaultTitle: 'Contacts by Tag', defaultContent: 'Select one or more tags', color: '#dcfce7' },
      { type: 'contact-tag-donut', label: 'Donut Chart by Tag', defaultTitle: 'Contacts by Tag', defaultContent: '', color: '#f8fafc' }
    ]
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    widgets: [
      { type: 'opportunity-count', label: 'Numeric Cards', defaultTitle: 'Open Opportunities', defaultContent: '', color: '#ede9fe' },
      { type: 'opportunity-pie', label: 'Pie Charts', defaultTitle: 'Opportunity Status', defaultContent: '', color: '#f8fafc' },
      { type: 'opportunity-line', label: 'Line Charts', defaultTitle: 'Opportunity Trend', defaultContent: '', color: '#f8fafc' }
    ]
  },
  {
    id: 'invoices',
    label: 'Invoices',
    widgets: [
      { type: 'invoice-total', label: 'Numeric Cards', defaultTitle: 'Invoice Value', defaultContent: 'Shows subaccount invoice value', color: '#dbeafe' },
      { type: 'invoice-status', label: 'Horizontal Bar Charts', defaultTitle: 'Invoice Status', defaultContent: 'Paid, Sent, Draft, Void', color: '#dcfce7' },
      { type: 'invoice-pie', label: 'Pie Charts', defaultTitle: 'Invoice Status Pie', defaultContent: '', color: '#f8fafc' },
      { type: 'invoice-vertical-bar', label: 'Vertical Bar Charts', defaultTitle: 'Invoice Value by Status', defaultContent: '', color: '#f8fafc' }
    ]
  },
  {
    id: 'users',
    label: 'Users',
    widgets: [
      { type: 'user-count', label: 'Numeric Cards', defaultTitle: 'Users', defaultContent: '', color: '#fef3c7' },
      { type: 'user-role-bar', label: 'Vertical Bar Charts', defaultTitle: 'Users by Role', defaultContent: '', color: '#f8fafc' }
    ]
  }
];

const dashboardWidgetTypes = dashboardWidgetFolders.flatMap((folder) => folder.widgets);

const defaultDashboardLayout = {
  backgroundColor: '#f8f5ff',
  backgroundImageUrl: '',
  columns: 12
};

function isKnownPage(page) {
  return navPageIds.has(page) || String(page || '').startsWith('dashboard-view:');
}

function getInitialActivePage() {
  if (typeof window === 'undefined') return 'dashboard';

  const pageFromUrl = new URLSearchParams(window.location.search).get('page');
  if (isKnownPage(pageFromUrl)) return pageFromUrl;

  const savedPage = window.localStorage.getItem('zeaBoardActivePage');
  return isKnownPage(savedPage) ? savedPage : 'dashboard';
}

function getInitialInvoiceCardColors() {
  if (typeof window === 'undefined') return {};

  try {
    return JSON.parse(window.localStorage.getItem('zeaBoardInvoiceCardColors')) || {};
  } catch {
    return {};
  }
}

const iconPaths = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm8 0h8v-9h-8v9Zm0-16v5h8V4h-8Z',
  database: 'M12 3c4.42 0 8 1.34 8 3s-3.58 3-8 3-8-1.34-8-3 3.58-3 8-3Zm-8 5.6c1.45 1.15 4.35 1.9 8 1.9s6.55-.75 8-1.9V12c0 1.66-3.58 3-8 3s-8-1.34-8-3V8.6Zm0 5.5c1.45 1.15 4.35 1.9 8 1.9s6.55-.75 8-1.9V17c0 1.66-3.58 3-8 3s-8-1.34-8-3v-2.9Z',
  invoice: 'M7 3h8l4 4v14H7V3Zm7 1.5V8h3.5L14 4.5ZM9 11h8v2H9v-2Zm0 4h8v2H9v-2Z',
  employees: 'M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3ZM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.67 0-5 1.34-5 3v2h10v-2c0-1.66-2.33-3-5-3Zm8 0c-.32 0-.63.02-.93.07 1.18.85 1.93 1.96 1.93 3.23V18h4v-2c0-1.66-2.33-3-5-3Z',
  users: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.33 0-6 1.67-6 3.73V20h12v-2.27C18 15.67 15.33 14 12 14Z',
  editor: 'M4 5h16v3H4V5Zm0 5h10v3H4v-3Zm0 5h16v4H4v-4Zm12-5h4v3h-4v-3Z',
  palette: 'M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a1.5 1.5 0 0 1 0-3h1a8 8 0 0 0 8-8.02C19.36 3.75 15.95 3 12 3ZM7.5 11A1.5 1.5 0 1 1 7.5 8a1.5 1.5 0 0 1 0 3Zm3-3A1.5 1.5 0 1 1 10.5 5a1.5 1.5 0 0 1 0 3Zm4 0A1.5 1.5 0 1 1 14.5 5a1.5 1.5 0 0 1 0 3Z',
  bell: 'M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6-2-2v-5a5 5 0 0 0-10 0v5l-2 2v1h14v-1Z',
  webhook: 'M7 7a4 4 0 0 1 7.46-2H17a4 4 0 0 1 0 8h-3v-2h3a2 2 0 0 0 0-4h-3.76l-.28-.62A2 2 0 0 0 9.2 7H7Zm10 10a4 4 0 0 1-7.46 2H7a4 4 0 0 1 0-8h3v2H7a2 2 0 0 0 0 4h3.76l.28.62A2 2 0 0 0 14.8 17H17Z',
  logs: 'M5 4h14v2H5V4Zm0 5h14v2H5V9Zm0 5h10v2H5v-2Zm0 5h14v2H5v-2Z'
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={iconPaths[name] || iconPaths.dashboard} />
    </svg>
  );
}

function UiIcon({ name }) {
  const paths = {
    chevronDown: 'M7 10l5 5 5-5H7Z',
    calendar: 'M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z',
    chevronLeft: 'M15.5 5 8.5 12l7 7-1.5 1.5L5.5 12 14 3.5 15.5 5Z',
    chevronRight: 'M8.5 19l7-7-7-7L10 3.5l8.5 8.5L10 20.5 8.5 19Z',
    sortAsc: 'M7 14l5-5 5 5H7Z',
    sortDesc: 'M7 10h10l-5 5-5-5Z',
    search: 'M10 4a6 6 0 1 0 3.65 10.76l4.3 4.29 1.1-1.1-4.29-4.3A6 6 0 0 0 10 4Zm0 1.8a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4Z'
  };
  return <svg className={`ui-icon ui-icon-${name}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}


function formatCurrency(value, currency = 'USD') {
  const number = Number(value || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(number);
}

function formatExchangeRate(value, currency = 'USD') {
  const number = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(number);
}

function StatusBadge({ value }) {
  const status = String(value || 'unknown').toLowerCase();
  return <span className={`status-badge status-${status}`}>{value || 'Unknown'}</span>;
}

function CustomSelect({ value, onChange, options, placeholder = 'Select', className = '' }) {
  const [open, setOpen] = useState(false);
  const selectRef = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    function handleOutsideClick(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className={`custom-select ${className}`} ref={selectRef}>
      <button type="button" className={open ? 'custom-select-trigger open' : 'custom-select-trigger'} onClick={() => setOpen(!open)}>
        <span>{selected?.label || placeholder}</span>
        <b><UiIcon name="chevronDown" /></b>
      </button>
      {open && (
        <div className="custom-select-menu">
          {options.map((option) => (
            <button
              type="button"
              key={`${option.value}-${option.label}`}
              className={String(option.value) === String(value) ? 'selected' : ''}
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomDatePicker({ value, onChange, placeholder = 'Select date', className = '' }) {
  const pickerRef = useRef(null);
  const initialDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  useEffect(() => {
    function handleOutsideClick(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  function selectDay(day) {
    const selectedDate = new Date(year, month, day);
    const iso = selectedDate.toISOString().slice(0, 10);
    onChange(iso);
    setOpen(false);
  }

  return (
    <div className={`custom-date ${className}`} ref={pickerRef}>
      <button type="button" className={open ? 'custom-date-trigger open' : 'custom-date-trigger'} onClick={() => setOpen(!open)}>
        <span>{value ? new Date(`${value}T00:00:00`).toLocaleDateString() : placeholder}</span>
        <b><UiIcon name="calendar" /></b>
      </button>
      {open && (
        <div className="custom-calendar">
          <div className="calendar-header">
            <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}><UiIcon name="chevronLeft" /></button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}><UiIcon name="chevronRight" /></button>
          </div>
          <div className="calendar-weekdays">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-days">
            {days.map((day, index) => day ? (
              <button type="button" key={`${month}-${day}`} className={value === new Date(year, month, day).toISOString().slice(0, 10) ? 'selected' : ''} onClick={() => selectDay(day)}>{day}</button>
            ) : <span key={`blank-${index}`} />)}
          </div>
          <div className="calendar-footer">
            <button type="button" className="ghost-button" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
            <button type="button" onClick={() => { const today = new Date(); onChange(today.toISOString().slice(0, 10)); setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setOpen(false); }}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportMenu({ onExport }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const options = [
    { key: 'csv', label: 'Export as CSV' },
    { key: 'excel', label: 'Export as Excel' },
    { key: 'pdf', label: 'Export as PDF' }
  ];

  useEffect(() => {
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="export-menu" ref={menuRef}>
      <button type="button" className="icon-menu-button" aria-label="Invoice export options" onClick={() => setOpen(!open)}>&#8942;</button>
      {open && (
        <div className="export-menu-list">
          {options.map((option) => (
            <button
              type="button"
              key={option.key}
              onClick={() => {
                onExport(option.key);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DataTable({ columns, rows, rowKey, emptyText, onSort, sortState }) {
  return (
    <div className="table-card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.sortable && onSort ? (
                    <button className="sort-button" onClick={() => onSort(column.key)}>
                      {column.label} {sortState?.sortBy === column.key ? <UiIcon name={sortState.sortDirection === 'asc' ? 'sortAsc' : 'sortDesc'} /> : null}
                    </button>
                  ) : column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row[rowKey] || index}>
                {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="empty-state">{emptyText}</div>}
    </div>
  );
}

function App() {
  const [form, setForm] = useState({ name: '', locationId: '', apiKey: '' });
  const [subAccounts, setSubAccounts] = useState([]);
  const [activeSubAccountId, setActiveSubAccountId] = useState('');
  const [contacts, setContacts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [invoiceMeta, setInvoiceMeta] = useState({ pagination: { total: 0, page: 1, limit: 25, offset: 0 }, summary: {}, filters: {} });
  const [invoiceQuery, setInvoiceQuery] = useState(defaultInvoiceQuery);
  const invoiceQueryRef = useRef(defaultInvoiceQuery);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState({ USD: 1 });
  const [exchangeUpdatedAt, setExchangeUpdatedAt] = useState('');
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilters, setAuditFilters] = useState({ eventType: '', contactId: '', dateFrom: '', dateTo: '' });
  const [dashboards, setDashboards] = useState([]);
  const [dashboardForm, setDashboardForm] = useState({ subAccountId: '', name: '' });
  const [editorDashboard, setEditorDashboard] = useState(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState('');
  const [dashboardPreview, setDashboardPreview] = useState(false);
  const [dashboardContactsBySubAccount, setDashboardContactsBySubAccount] = useState({});
  const [openWidgetFolders, setOpenWidgetFolders] = useState({ elements: true, contacts: true });
  const [activePage, setActivePage] = useState(getInitialActivePage);
  const [databaseList, setDatabaseList] = useState('contacts');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(settingsPageIds.has(activePage));
  const [customization, setCustomization] = useState(defaultCustomization);
  const [customForm, setCustomForm] = useState(defaultCustomization);
  const [showInvoiceCardEditor, setShowInvoiceCardEditor] = useState(false);
  const [invoiceCardColors, setInvoiceCardColors] = useState(getInitialInvoiceCardColors);
  const dashboardCanvasRef = useRef(null);
  const dashboardSaveTimerRef = useRef(null);
  const settingsFlyoutRef = useRef(null);

  const activeSubAccount = useMemo(
    () => subAccounts.find((subAccount) => subAccount.id === activeSubAccountId),
    [activeSubAccountId, subAccounts]
  );

  const appStyle = {
    '--primary': customization.primaryColor,
    '--secondary': customization.secondaryColor,
    '--accent': customization.accentColor,
    '--app-bg': customization.backgroundColor,
    '--surface': customization.surfaceColor,
    '--text': customization.textColor,
    '--font-family': openSansFontStack,
    '--sidepanel-font': openSansSimpleFontStack,
    '--column-font': openSansSimpleFontStack,
    '--hero-image': customization.backgroundImageUrl ? `url(${customization.backgroundImageUrl})` : 'none'
  };

  async function loadSubAccounts() {
    const response = await fetch(`${apiBaseUrl}/api/sub-accounts`);
    const data = await response.json();
    setSubAccounts(data.subAccounts || []);
    if (!activeSubAccountId && data.subAccounts?.length) {
      setActiveSubAccountId(data.subAccounts[0].id);
    }
  }

  async function loadContacts(subAccountId) {
    if (!subAccountId) {
      setContacts([]);
      return;
    }

    const response = await fetch(`${apiBaseUrl}/api/sub-accounts/${subAccountId}/contacts`);
    const data = await response.json();
    setContacts(data.contacts || []);
  }

  async function loadDashboardContacts(subAccountId) {
    if (!subAccountId || dashboardContactsBySubAccount[subAccountId]) return;

    const response = await fetch(`${apiBaseUrl}/api/sub-accounts/${subAccountId}/contacts?limit=500`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to load dashboard contacts');
    setDashboardContactsBySubAccount((currentContacts) => ({ ...currentContacts, [subAccountId]: data.contacts || [] }));
  }

  async function loadOpportunities() {
    const response = await fetch(`${apiBaseUrl}/api/opportunities`);
    const data = await response.json();
    setOpportunities(data.opportunities || []);
  }

  async function loadInvoices(overrides = {}) {
    const nextQuery = { ...invoiceQueryRef.current, ...overrides };
    const params = new URLSearchParams();
    Object.entries(nextQuery).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) params.set(key, value);
    });

    const response = await fetch(`${apiBaseUrl}/api/invoices?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to load invoices');
    setInvoices(data.invoices || []);
    setInvoiceMeta({
      pagination: data.pagination || { total: 0, page: 1, limit: nextQuery.limit, offset: 0 },
      summary: data.summary || {},
      filters: data.filters || {}
    });
    invoiceQueryRef.current = nextQuery;
    setInvoiceQuery(nextQuery);
  }

  async function loadUsers() {
    const response = await fetch(`${apiBaseUrl}/api/users`);
    const data = await response.json();
    setUsers(data.users || []);
  }

  async function loadDashboards() {
    const response = await fetch(`${apiBaseUrl}/api/dashboards`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to load dashboards');
    setDashboards(data.dashboards || []);
  }

  async function loadCustomization() {
    const response = await fetch(`${apiBaseUrl}/api/customization`);
    const data = await response.json();
    const next = { ...defaultCustomization, ...(data.customization || {}) };
    setCustomization(next);
    setCustomForm(next);
  }


  async function loadAuditLogs(filters = auditFilters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    const response = await fetch(`${apiBaseUrl}/api/audit-logs${query ? `?${query}` : ''}`);
    const data = await response.json();
    setAuditLogs(data.logs || []);
  }

  async function refreshAll() {
    await Promise.all([loadSubAccounts(), loadOpportunities(), loadInvoices(), loadUsers(), loadCustomization(), loadAuditLogs(), loadDashboards()]);
  }

  useEffect(() => {
    refreshAll().catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    invoiceQueryRef.current = invoiceQuery;
  }, [invoiceQuery]);

  useEffect(() => {
    window.localStorage.setItem('zeaBoardInvoiceCardColors', JSON.stringify(invoiceCardColors));
  }, [invoiceCardColors]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (settingsFlyoutRef.current && !settingsFlyoutRef.current.contains(event.target)) {
        setSettingsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!editorDashboard?.id) return undefined;
    window.clearTimeout(dashboardSaveTimerRef.current);
    dashboardSaveTimerRef.current = window.setTimeout(() => {
      saveEditorDashboard({ silent: true });
    }, 900);
    return () => window.clearTimeout(dashboardSaveTimerRef.current);
  }, [editorDashboard]);

  useEffect(() => {
    const viewedDashboardId = String(activePage || '').startsWith('dashboard-view:') ? activePage.replace('dashboard-view:', '') : '';
    const viewedDashboard = dashboards.find((dashboard) => dashboard.id === viewedDashboardId);
    const subAccountId = editorDashboard?.subAccountId || viewedDashboard?.subAccountId;
    if (subAccountId) loadDashboardContacts(subAccountId).catch((error) => setMessage(error.message));
  }, [activePage, dashboards, editorDashboard?.subAccountId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isKnownPage(activePage)) return;

    window.localStorage.setItem('zeaBoardActivePage', activePage);

    const url = new URL(window.location.href);
    if (url.searchParams.get('page') !== activePage) {
      url.searchParams.set('page', activePage);
      window.history.replaceState({}, '', url);
    }
  }, [activePage]);

  useEffect(() => {
    async function loadExchangeRates() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/exchange-rates`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load exchange rates');
        setExchangeRates({ USD: 1, ...(data.rates || {}) });
        setExchangeUpdatedAt(data.updatedAt || new Date().toISOString());
      } catch (error) {
        setMessage(`Exchange rate update failed: ${error.message}`);
      }
    }

    loadExchangeRates();
    const intervalId = window.setInterval(loadExchangeRates, 30 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    loadContacts(activeSubAccountId).catch((error) => setMessage(error.message));
  }, [activeSubAccountId]);

  useEffect(() => {
    if (!activeSubAccountId) return undefined;
    const intervalId = window.setInterval(() => {
      loadContacts(activeSubAccountId).catch((error) => setMessage(error.message));
      loadOpportunities().catch((error) => setMessage(error.message));
      loadInvoices().catch((error) => setMessage(error.message));
      loadUsers().catch((error) => setMessage(error.message));
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, [activeSubAccountId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/sub-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to add sub-account');

      setForm({ name: '', locationId: '', apiKey: '' });
      setMessage(`Sub-account added. Contacts table: ${data.subAccount.contacts_table_name}`);
      await loadSubAccounts();
      setActiveSubAccountId(data.subAccount.id);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function syncContacts() {
    if (!activeSubAccountId) return;
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/sub-accounts/${activeSubAccountId}/sync`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sync failed');
      setMessage(`Synced ${data.synced} contacts`);
      await Promise.all([loadSubAccounts(), loadContacts(activeSubAccountId)]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveCustomization(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const payload = {
        ...customForm,
        sidepanelFontFamily: customForm.sidepanelFontFamily,
        columnFontFamily: customForm.columnFontFamily,
        colorPalette: String(customForm.colorPaletteInput || customForm.colorPalette.join(','))
          .split(',')
          .map((color) => color.trim())
          .filter(Boolean)
      };
      const response = await fetch(`${apiBaseUrl}/api/customization`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save customization');
      const next = { ...defaultCustomization, ...data.customization };
      setCustomization(next);
      setCustomForm(next);
      setMessage('Customization saved.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function normalizeDashboard(dashboard) {
    return {
      ...dashboard,
      layout: { ...defaultDashboardLayout, ...(dashboard.layout || {}) },
      widgets: Array.isArray(dashboard.widgets) ? dashboard.widgets : []
    };
  }

  async function createCustomDashboard(event) {
    event.preventDefault();
    if (!dashboardForm.subAccountId || !dashboardForm.name.trim()) {
      setMessage('Choose a subaccount and enter a dashboard name.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/dashboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subAccountId: dashboardForm.subAccountId,
          name: dashboardForm.name.trim(),
          layout: defaultDashboardLayout,
          widgets: []
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create dashboard');
      const dashboard = normalizeDashboard(data.dashboard);
      setDashboards((currentDashboards) => [dashboard, ...currentDashboards.filter((item) => item.id !== dashboard.id)]);
      setEditorDashboard(dashboard);
      setSelectedWidgetId('');
      setDashboardPreview(false);
      setDashboardForm({ subAccountId: '', name: '' });
      setMessage('Dashboard created. Start dragging widgets onto the canvas.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveEditorDashboard({ silent = false } = {}) {
    if (!editorDashboard?.id) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/dashboards/${editorDashboard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editorDashboard.name,
          layout: editorDashboard.layout,
          widgets: editorDashboard.widgets
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save dashboard');
      const dashboard = normalizeDashboard(data.dashboard);
      setDashboards((currentDashboards) => currentDashboards.map((item) => (item.id === dashboard.id ? dashboard : item)));
      if (!silent) {
        setEditorDashboard(dashboard);
        setMessage('Dashboard saved.');
      }
    } catch (error) {
      if (!silent) setMessage(error.message);
    }
  }

  function updateEditorDashboard(patch) {
    setEditorDashboard((currentDashboard) => currentDashboard ? { ...currentDashboard, ...patch } : currentDashboard);
  }

  function updateDashboardLayout(patch) {
    setEditorDashboard((currentDashboard) => currentDashboard ? {
      ...currentDashboard,
      layout: { ...defaultDashboardLayout, ...(currentDashboard.layout || {}), ...patch }
    } : currentDashboard);
  }

  function addDashboardWidget(type, position = {}) {
    const definition = dashboardWidgetTypes.find((widget) => widget.type === type) || dashboardWidgetTypes[0];
    const widget = {
      id: crypto.randomUUID(),
      type: definition.type,
      title: definition.defaultTitle,
      content: definition.defaultContent,
      x: position.x ?? 24,
      y: position.y ?? 24,
      width: definition.type === 'divider' ? 360 : 240,
      height: definition.type === 'divider' ? 70 : 150,
      color: definition.color,
      textColor: '#172033',
      imageUrl: ''
    };
    setEditorDashboard((currentDashboard) => currentDashboard ? {
      ...currentDashboard,
      widgets: [...(currentDashboard.widgets || []), widget]
    } : currentDashboard);
    setSelectedWidgetId(widget.id);
  }

  function updateDashboardWidget(widgetId, patch) {
    setEditorDashboard((currentDashboard) => currentDashboard ? {
      ...currentDashboard,
      widgets: currentDashboard.widgets.map((widget) => widget.id === widgetId ? { ...widget, ...patch } : widget)
    } : currentDashboard);
  }

  function duplicateDashboardWidget(widgetId) {
    const widget = editorDashboard?.widgets.find((item) => item.id === widgetId);
    if (!widget) return;
    const copy = { ...widget, id: crypto.randomUUID(), title: `${widget.title} Copy`, x: widget.x + 24, y: widget.y + 24 };
    setEditorDashboard((currentDashboard) => currentDashboard ? { ...currentDashboard, widgets: [...currentDashboard.widgets, copy] } : currentDashboard);
    setSelectedWidgetId(copy.id);
  }

  function deleteDashboardWidget(widgetId) {
    setEditorDashboard((currentDashboard) => currentDashboard ? {
      ...currentDashboard,
      widgets: currentDashboard.widgets.filter((widget) => widget.id !== widgetId)
    } : currentDashboard);
    setSelectedWidgetId('');
  }

  function numericValue(value) {
    return Number(value || 0);
  }

  function convertMoney(value, originalCurrency = 'USD') {
    const source = String(originalCurrency || 'USD').toUpperCase();
    const target = selectedCurrency;
    const sourceRate = exchangeRates[source];
    const targetRate = exchangeRates[target];

    if (!sourceRate || !targetRate) {
      return numericValue(value);
    }

    return numericValue(value) / sourceRate * targetRate;
  }

  function hasExchangeRate(currency) {
    return Boolean(exchangeRates[String(currency || 'USD').toUpperCase()]);
  }

  function formatInvoiceMoney(value, originalCurrency = 'USD') {
    return formatCurrency(convertMoney(value, originalCurrency), selectedCurrency);
  }

  function invoiceValue(invoice) {
    return numericValue(invoice.amount_paid) + numericValue(invoice.amount_due);
  }

  function updateInvoiceQuery(patch) {
    const nextQuery = { ...invoiceQuery, ...patch };
    if (!Object.prototype.hasOwnProperty.call(patch, 'page')) nextQuery.page = 1;
    loadInvoices(nextQuery).catch((error) => setMessage(error.message));
  }

  function sortInvoices(sortBy) {
    const sortDirection = invoiceQuery.sortBy === sortBy && invoiceQuery.sortDirection === 'asc' ? 'desc' : 'asc';
    updateInvoiceQuery({ sortBy, sortDirection });
  }

  async function fetchInvoicesForExport() {
    const params = { ...invoiceQuery, page: 1, limit: 5000 };
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) query.set(key, value);
    });
    const response = await fetch(`${apiBaseUrl}/api/invoices?${query.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Export failed');
    return data.invoices || [];
  }

  function invoiceExportRows(rows) {
    return rows.map((invoice) => ({
      'Invoice Number': invoice.invoice_number || '',
      Status: invoice.status || '',
      'Contact Name': invoice.contact_name || '',
      'Contact Email': invoice.contact_email || '',
      'Product Name': invoice.product_name || '',
      [`Amount Paid (${selectedCurrency})`]: convertMoney(invoice.amount_paid, invoice.currency).toFixed(2),
      [`Amount Due (${selectedCurrency})`]: convertMoney(invoice.amount_due, invoice.currency).toFixed(2),
      [`Invoice Value (${selectedCurrency})`]: convertMoney(invoiceValue(invoice), invoice.currency).toFixed(2),
      Discount: invoice.discount || '',
      'Discount Type': invoice.discount_type || '',
      'Original Currency': invoice.currency || '',
      Subaccount: invoice.subaccount_name || '',
      'Created Date': invoice.created_in_crm_on || invoice.ghl_created_at || '',
      'Invoice ID': invoice.invoice_id || ''
    }));
  }

  function downloadTextFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function toCsv(rows) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    return [headers.map(escapeCell).join(','), ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))].join('\n');
  }

  async function exportInvoices(format) {
    try {
      const rows = invoiceExportRows(await fetchInvoicesForExport());
      if (!rows.length) {
        setMessage('No invoices available to export.');
        return;
      }

      fetch(`${apiBaseUrl}/api/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'ExportRun',
          payload: { module: 'invoices', format, displayCurrency: selectedCurrency, filters: invoiceQuery, rowCount: rows.length }
        })
      }).catch(() => {});

      if (format === 'pdf') {
        const printable = window.open('', '_blank');
        printable.document.write(`<html><head><title>Zea Board Invoices</title><style>body{font-family:Open Sans,Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f1ff}</style></head><body><h1>Invoice Export</h1><p>Currency: ${selectedCurrency}</p><table><thead><tr>${Object.keys(rows[0]).map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${Object.values(row).map((value) => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`);
        printable.document.close();
        printable.print();
        return;
      }

      const csv = toCsv(rows);
      downloadTextFile(format === 'excel' ? 'zea-board-invoices.xls' : 'zea-board-invoices.csv', csv, format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv');
    } catch (error) {
      setMessage(error.message);
    }
  }

  function convertedInvoiceSummary(summary = invoiceMeta.summary || {}) {
    const totalsByCurrency = Array.isArray(summary.totals_by_currency) ? summary.totals_by_currency : [];
    if (!totalsByCurrency.length) {
      return {
        totalAmountPaid: convertMoney(summary.total_amount_paid, 'USD'),
        totalOutstanding: convertMoney(summary.total_outstanding, 'USD'),
        totalInvoiceValue: convertMoney(summary.total_invoice_value, 'USD')
      };
    }

    return totalsByCurrency.reduce((totals, row) => {
      const currency = row.currency || 'USD';
      totals.totalAmountPaid += convertMoney(row.total_amount_paid, currency);
      totals.totalOutstanding += convertMoney(row.total_outstanding, currency);
      totals.totalInvoiceValue += convertMoney(row.total_invoice_value, currency);
      return totals;
    }, { totalAmountPaid: 0, totalOutstanding: 0, totalInvoiceValue: 0 });
  }

  const totals = {
    contacts: contacts.length,
    opportunities: opportunities.length,
    invoices: invoices.length,
    users: users.length,
    invoiceValue: invoices.reduce((sum, invoice) => sum + Number(invoice.amount_due || invoice.amount_paid || 0), 0),
    openOpportunities: opportunities.filter((opportunity) => String(opportunity.status).toLowerCase() === 'open').length
  };

  const contactColumns = [
    { key: 'contact_id', label: 'Contact ID' },
    { key: 'sub_account_name', label: 'Sub Account Name' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone_number', label: 'Phone Number' },
    { key: 'tag', label: 'Tag' },
    { key: 'source', label: 'Source' },
    { key: 'assigned_user', label: 'Assigned User' },
    { key: 'leadgen_owner', label: 'LeadGen Owner' },
    { key: 'created_in_crm_on', label: 'Created in CRM On' }
  ];

  const opportunityColumns = [
    { key: 'opportunity_id', label: 'Opportunity ID' },
    { key: 'name', label: 'Name' },
    { key: 'monetary_value', label: 'Value' },
    { key: 'currency', label: 'Currency' },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
    { key: 'contact_email', label: 'Contact Email' },
    { key: 'forecast_expected_close_date', label: 'Expected Close' }
  ];

  const invoiceColumns = [
    { key: 'invoice_number', label: 'Invoice Number', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (row) => <StatusBadge value={row.status} /> },
    { key: 'contact_name', label: 'Contact Name', sortable: true },
    { key: 'amount_paid', label: `Amount Paid (${selectedCurrency})`, sortable: true, render: (row) => formatInvoiceMoney(row.amount_paid, row.currency) },
    { key: 'amount_due', label: `Amount Due (${selectedCurrency})`, sortable: true, render: (row) => formatInvoiceMoney(row.amount_due, row.currency) },
    { key: 'currency', label: 'Original Currency', sortable: true },
    { key: 'subaccount_name', label: 'Subaccount', sortable: true, render: (row) => row.subaccount_name || 'Unmatched' },
    { key: 'created_in_crm_on', label: 'Created Date', sortable: true, render: (row) => row.created_in_crm_on ? new Date(row.created_in_crm_on).toLocaleDateString() : '' },
    { key: 'details', label: 'Action', render: (row) => <button className="ghost-button table-action" onClick={() => setSelectedInvoice(row)}>View Details</button> }
  ];

  const userColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'extension', label: 'Extension' },
    { key: 'user_type', label: 'User Type' },
    { key: 'role', label: 'Role', render: (row) => <StatusBadge value={row.role} /> }
  ];

  function renderDashboard() {
    return (
      <>
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Admin Dashboard</p>
            <h1>Welcome to {customization.appName}</h1>
            <p>Monitor CRM contacts, invoices, opportunities, users, and webhook activity from one calm command center.</p>
          </div>
          <div className="hero-orbit">
            <span>{totals.contacts}</span>
            <small>Live Contacts</small>
          </div>
        </section>

        <section className="metric-grid">
          <div className="metric-card mint"><span>Contacts</span><strong>{totals.contacts}</strong><small>Active synced records</small></div>
          <div className="metric-card coral"><span>Open Deals</span><strong>{totals.openOpportunities}</strong><small>Opportunity pipeline</small></div>
          <div className="metric-card cyan"><span>Invoice Value</span><strong>{formatCurrency(totals.invoiceValue)}</strong><small>Paid / due total</small></div>
          <div className="metric-card violet"><span>Users</span><strong>{totals.users}</strong><small>Team members</small></div>
        </section>

        <section className="dashboard-grid">
          <div className="panel soft-panel">
            <div className="panel-header compact"><div><h2>Latest Invoices</h2><p>Database table: invoice_list</p></div><button onClick={() => setActivePage('invoices')}>View all</button></div>
            <DataTable columns={invoiceColumns.slice(1, 7)} rows={invoices.slice(0, 5)} rowKey="invoice_id" emptyText="No invoices yet." />
          </div>
          <div className="panel activity-panel">
            <h2>System Snapshot</h2>
            <div className="activity-list">
              <div><span className="dot purple" />Webhook endpoint ready</div>
              <div><span className="dot cyan" />{subAccounts.length} sub-accounts connected</div>
              <div><span className="dot yellow" />Customization table enabled</div>
              <div><span className="dot coral" />Database pages preserved</div>
            </div>
          </div>
        </section>
      </>
    );
  }

  function renderAddSubAccountCard() {
    return (
      <div className="panel form-panel">
        <div className="panel-header compact"><div><h2>Add Sub-Account</h2><p>Connect a CRM location to Zea Board.</p></div></div>
        <form onSubmit={handleSubmit}>
          <label>Sub-account name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label>API key or private integration token<input type="password" value={form.apiKey} onChange={(event) => setForm({ ...form, apiKey: event.target.value })} required /></label>
          <label>Location ID<input value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })} required /></label>
          <button disabled={loading}>{loading ? 'Working...' : 'Add Sub-Account'}</button>
        </form>
      </div>
    );
  }

  function renderDatabasePage() {
    const databaseViews = [
      { id: 'contacts', label: 'Contacts' },
      { id: 'opportunities', label: 'Opportunities' },
      { id: 'invoices', label: 'Invoices' },
      { id: 'users', label: 'Users' }
    ];

    return (
      <>
        <div className="page-title-row"><div><p className="eyebrow">Database</p><h1>CRM Database</h1></div>{renderRefreshButton()}</div>
        <div className="pill-row">{databaseViews.map((view) => <button key={view.id} className={databaseList === view.id ? 'active' : ''} onClick={() => setDatabaseList(view.id)}>{view.label}</button>)}</div>
        {databaseList === 'contacts' && renderContactsTable()}
        {databaseList === 'opportunities' && <DataTable columns={opportunityColumns} rows={opportunities} rowKey="opportunity_id" emptyText="No opportunities loaded yet." />}
        {databaseList === 'invoices' && <DataTable columns={invoiceColumns} rows={invoices} rowKey="invoice_id" emptyText="No invoices loaded yet." />}
        {databaseList === 'users' && <DataTable columns={userColumns} rows={users} rowKey="id" emptyText="No users loaded yet." />}
      </>
    );
  }

  function renderContactsTable() {
    return (
      <>
        <div className="tabs subaccount-tabs">
          {subAccounts.map((subAccount) => <button key={subAccount.id} className={subAccount.id === activeSubAccountId ? 'active' : ''} onClick={() => setActiveSubAccountId(subAccount.id)}>{subAccount.name}</button>)}
        </div>
        <div className="panel-header table-header"><div><h2>{activeSubAccount ? activeSubAccount.name : 'Contacts'}</h2>{activeSubAccount && <p>Table: {activeSubAccount.contacts_table_name}</p>}</div><button onClick={syncContacts} disabled={!activeSubAccountId || loading}>Sync Contacts</button></div>
        <DataTable columns={contactColumns} rows={contacts} rowKey="contact_id" emptyText="No contacts loaded for this sub-account." />
      </>
    );
  }

  function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function invoiceDatePresetRange(preset) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = new Date(year, month, now.getDate());

    if (preset === 'today') {
      const value = formatLocalDate(today);
      return { dateFrom: value, dateTo: value };
    }

    if (preset === 'thisWeek') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return { dateFrom: formatLocalDate(weekStart), dateTo: formatLocalDate(weekEnd) };
    }

    if (preset === 'thisMonth') {
      return {
        dateFrom: formatLocalDate(new Date(year, month, 1)),
        dateTo: formatLocalDate(new Date(year, month + 1, 0))
      };
    }
    if (preset === 'thisQuarter') {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      return {
        dateFrom: formatLocalDate(new Date(year, quarterStartMonth, 1)),
        dateTo: formatLocalDate(new Date(year, quarterStartMonth + 3, 0))
      };
    }
    if (preset === 'thisYear') {
      return {
        dateFrom: formatLocalDate(new Date(year, 0, 1)),
        dateTo: formatLocalDate(new Date(year, 11, 31))
      };
    }
    return { dateFrom: '', dateTo: '' };
  }

  function applyInvoiceDatePreset(datePreset) {
    updateInvoiceQuery({ datePreset, ...invoiceDatePresetRange(datePreset), page: 1 });
  }

  function updateInvoiceCardColor(cardKey, color) {
    setInvoiceCardColors((currentColors) => ({ ...currentColors, [cardKey]: color }));
  }

  function invoiceCardStyle(cardKey) {
    const color = invoiceCardColors[cardKey];
    if (!color) return undefined;
    return { background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 78%, #ffffff))`, color: '#ffffff' };
  }

  function renderInvoicesPage() {
    const summary = invoiceMeta.summary || {};
    const pagination = invoiceMeta.pagination || { total: 0, page: 1, limit: invoiceQuery.limit };
    const totalPages = Math.max(Math.ceil((pagination.total || 0) / Number(invoiceQuery.limit || 25)), 1);
    const filters = invoiceMeta.filters || {};
    const usdToSelected = exchangeRates[selectedCurrency] || 1;
    const convertedSummary = convertedInvoiceSummary(summary);
    const cardData = [
      { key: 'totalInvoices', label: 'Total Invoices', value: summary.total_invoices || 0, tone: 'deep-blue' },
      { key: 'paidInvoices', label: 'Paid Invoices', value: summary.paid_invoices || 0, tone: 'dark-green' },
      { key: 'sentInvoices', label: 'Sent Invoices', value: summary.sent_invoices || 0, tone: 'cyan' },
      { key: 'draftInvoices', label: 'Draft Invoices', value: summary.draft_invoices || 0, tone: 'amber' },
      { key: 'voidInvoices', label: 'Void Invoices', value: summary.void_invoices || 0, tone: 'coral' },
      { key: 'totalAmountPaid', label: 'Total Amount Paid', value: formatCurrency(convertedSummary.totalAmountPaid, selectedCurrency), tone: 'emerald' },
      { key: 'totalOutstanding', label: 'Total Outstanding', value: formatCurrency(convertedSummary.totalOutstanding, selectedCurrency), tone: 'coral' },
      { key: 'totalInvoiceValue', label: 'Total Invoice Value', value: formatCurrency(convertedSummary.totalInvoiceValue, selectedCurrency), tone: 'cyan' }
    ];

    return (
      <>
        <div className="page-title-row invoice-title-row">
          <div>
            <p className="eyebrow">Invoices</p>
            <h1>Invoice Management</h1>
            <p>Live CRM invoice data from invoice_list. Void invoices are excluded from revenue totals.</p>
          </div>
          <div className="invoice-currency-card">
            <label>Display Currency
              <CustomSelect value={selectedCurrency} onChange={setSelectedCurrency} options={currencyOptions.map((currency) => ({ value: currency, label: currency }))} />
            </label>
            <span>1 USD = {formatExchangeRate(usdToSelected, selectedCurrency)}</span>
            {exchangeUpdatedAt && <small>Updated: {new Date(exchangeUpdatedAt).toLocaleString()}</small>}
            {!hasExchangeRate(selectedCurrency) && <small className="rate-warning">Rate unavailable for {selectedCurrency}</small>}
          </div>
        </div>

        <div className="subaccount-filter-row">
          <button className={!invoiceQuery.subAccount ? 'active' : ''} onClick={() => updateInvoiceQuery({ subAccount: '', page: 1 })}>All</button>
          {subAccounts.map((subAccount) => (
            <button
              key={subAccount.location_id || subAccount.id}
              className={invoiceQuery.subAccount === subAccount.name ? 'active' : ''}
              onClick={() => updateInvoiceQuery({ subAccount: subAccount.name, page: 1 })}
            >
              {subAccount.name}
            </button>
          ))}
        </div>

        <div className="invoice-card-tools">
          <div>
            <h2>Invoice Overview</h2>
            <p>Customize the dashboard box colors for quick visual scanning.</p>
          </div>
          <button type="button" className="ghost-button" onClick={() => setShowInvoiceCardEditor((isOpen) => !isOpen)}>{showInvoiceCardEditor ? 'Close Editor' : 'Edit Card Colors'}</button>
        </div>

        {showInvoiceCardEditor && (
          <div className="invoice-card-editor">
            {cardData.map((card) => (
              <label key={card.key}>{card.label}
                <input type="color" value={invoiceCardColors[card.key] || invoiceCardColorDefaults[card.key]} onChange={(event) => updateInvoiceCardColor(card.key, event.target.value)} />
              </label>
            ))}
            <button type="button" className="ghost-button" onClick={() => setInvoiceCardColors({})}>Reset Colors</button>
          </div>
        )}

        <section className="invoice-metric-grid">
          {cardData.map((card) => <div key={card.key} className={`metric-card ${card.tone}`} style={invoiceCardStyle(card.key)}><span>{card.label}</span><strong>{card.value}</strong></div>)}
        </section>

        <form className="invoice-filter-panel" onSubmit={(event) => { event.preventDefault(); updateInvoiceQuery({ page: 1 }); }}>
          <label>Search
            <input value={invoiceQuery.search} onChange={(event) => setInvoiceQuery({ ...invoiceQuery, search: event.target.value })} placeholder="Invoice #, contact, email, product, ID" />
          </label>
          <label>Status
            <CustomSelect
              value={invoiceQuery.status}
              onChange={(status) => updateInvoiceQuery({ status })}
              placeholder="All Statuses"
              options={[{ value: '', label: 'All Statuses' }, ...Array.from(new Map([...invoiceStatusOptions, ...(filters.statuses || [])].filter(Boolean).map((status) => [String(status).toLowerCase(), status])).values()).map((status) => ({ value: status, label: status }))]}
            />
          </label>
          <label>Original Currency
            <CustomSelect
              value={invoiceQuery.currency}
              onChange={(currency) => updateInvoiceQuery({ currency })}
              placeholder="All Currencies"
              options={[{ value: '', label: 'All Currencies' }, ...(filters.currencies || []).map((currency) => ({ value: currency, label: currency }))]}
            />
          </label>
          <label>Date Range
            <CustomSelect
              value={invoiceQuery.datePreset}
              onChange={applyInvoiceDatePreset}
              placeholder="Custom Range"
              options={[
                { value: '', label: 'Custom Range' },
                { value: 'today', label: 'Today' },
                { value: 'thisWeek', label: 'This Week' },
                { value: 'thisMonth', label: 'This Month' },
                { value: 'thisQuarter', label: 'This Quarter' },
                { value: 'thisYear', label: 'This Year' }
              ]}
            />
          </label>
          <label>From
            <CustomDatePicker className="calendar-align-left" value={invoiceQuery.dateFrom} onChange={(dateFrom) => updateInvoiceQuery({ dateFrom, datePreset: '' })} placeholder="From date" />
          </label>
          <label>To
            <CustomDatePicker className="calendar-align-right" value={invoiceQuery.dateTo} onChange={(dateTo) => updateInvoiceQuery({ dateTo, datePreset: '' })} placeholder="To date" />
          </label>
          <label>Subaccount
            <CustomSelect
              value={invoiceQuery.subAccount}
              onChange={(subAccount) => updateInvoiceQuery({ subAccount })}
              placeholder="All Subaccounts"
              options={[{ value: '', label: 'All Subaccounts' }, ...(filters.subaccounts || []).map((subAccount) => ({ value: subAccount, label: subAccount }))]}
            />
          </label>
          <div className="filter-actions">
            <button type="submit">Apply Filters</button>
            <button type="button" className="ghost-button" onClick={() => loadInvoices(defaultInvoiceQuery).catch((error) => setMessage(error.message))}>Clear</button>
          </div>
        </form>

        <div className="invoice-toolbar panel-header compact">
          <div><h2>Invoices</h2><p>{pagination.total || 0} matching records - Page {invoiceQuery.page} of {totalPages}</p></div>
          <div className="export-actions">
            <ExportMenu onExport={exportInvoices} />
          </div>
        </div>

        <DataTable columns={invoiceColumns} rows={invoices} rowKey="invoice_id" emptyText="No invoices loaded yet." onSort={sortInvoices} sortState={invoiceQuery} />

        <div className="pagination-row">
          <label className="rows-per-page">Rows Per Page
            <CustomSelect className="open-up" value={invoiceQuery.limit} onChange={(limit) => updateInvoiceQuery({ limit: Number(limit), page: 1 })} options={[10, 25, 50, 100].map((limit) => ({ value: limit, label: String(limit) }))} />
          </label>
          <span>Showing {invoices.length} of {pagination.total || 0}</span>
          <button className="ghost-button" disabled={Number(invoiceQuery.page) <= 1} onClick={() => updateInvoiceQuery({ page: Number(invoiceQuery.page) - 1 })}>Previous</button>
          <button className="ghost-button" disabled={Number(invoiceQuery.page) >= totalPages} onClick={() => updateInvoiceQuery({ page: Number(invoiceQuery.page) + 1 })}>Next</button>
        </div>

        {selectedInvoice && (
          <div className="details-backdrop" onClick={() => setSelectedInvoice(null)}>
            <aside className="invoice-details-panel" onClick={(event) => event.stopPropagation()}>
              <div className="panel-header compact"><div><p className="eyebrow">Invoice Details</p><h2>{selectedInvoice.invoice_number || selectedInvoice.invoice_id}</h2></div><button className="ghost-button" onClick={() => setSelectedInvoice(null)}>Close</button></div>
              <div className="details-grid">
                <div><span>Status</span><strong><StatusBadge value={selectedInvoice.status} /></strong></div>
                <div><span>Contact</span><strong>{selectedInvoice.contact_name || 'Unknown'}</strong><small>{selectedInvoice.contact_email}</small></div>
                <div><span>Product</span><strong>{selectedInvoice.product_name || '-'}</strong></div>
                <div><span>Subaccount</span><strong>{selectedInvoice.subaccount_name || 'Unmatched'}</strong></div>
                <div><span>Amount Paid</span><strong>{formatInvoiceMoney(selectedInvoice.amount_paid, selectedInvoice.currency)}</strong><small>Original: {formatCurrency(numericValue(selectedInvoice.amount_paid), selectedInvoice.currency || 'USD')}</small></div>
                <div><span>Amount Due</span><strong>{formatInvoiceMoney(selectedInvoice.amount_due, selectedInvoice.currency)}</strong><small>Original: {formatCurrency(numericValue(selectedInvoice.amount_due), selectedInvoice.currency || 'USD')}</small></div>
                <div><span>Invoice Value</span><strong>{formatInvoiceMoney(invoiceValue(selectedInvoice), selectedInvoice.currency)}</strong></div>
                <div><span>Discount</span><strong>{selectedInvoice.discount || 0} {selectedInvoice.discount_type || ''}</strong></div>
                <div><span>Created Date</span><strong>{selectedInvoice.created_in_crm_on ? new Date(selectedInvoice.created_in_crm_on).toLocaleString() : '-'}</strong></div>
                <div><span>Invoice ID</span><strong>{selectedInvoice.invoice_id}</strong></div>
              </div>
            </aside>
          </div>
        )}
      </>
    );
  }

  function renderEmployeeManagement() {
    return <><div className="page-title-row"><div><p className="eyebrow">Settings</p><h1>Employee Management</h1><p>Database table: user_list</p></div><button onClick={loadUsers}>Refresh</button></div><DataTable columns={userColumns} rows={users} rowKey="id" emptyText="No employees loaded yet." /></>;
  }

  function contactTags(contact) {
    if (Array.isArray(contact.tags)) return contact.tags.map(String).map((tag) => tag.trim()).filter(Boolean);
    return String(contact.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
  }

  function dashboardContactRows(dashboard) {
    return dashboardContactsBySubAccount[dashboard?.subAccountId] || [];
  }

  function uniqueContactTags(dashboard) {
    return [...new Set(dashboardContactRows(dashboard).flatMap(contactTags))].sort();
  }

  function tagCounts(dashboard) {
    return uniqueContactTags(dashboard).map((tag) => ({
      label: tag,
      value: dashboardContactRows(dashboard).filter((contact) => contactTags(contact).includes(tag)).length
    })).filter((item) => item.value > 0);
  }

  function renderMiniChart(items, type = 'bar') {
    const data = items.length ? items.slice(0, 6) : [{ label: 'No data', value: 0 }];
    const max = Math.max(...data.map((item) => item.value), 1);

    if (type === 'donut' || type === 'pie') {
      return <div className={`mini-chart ${type}`}><div className="mini-chart-ring">{data.reduce((total, item) => total + item.value, 0)}</div><div>{data.map((item) => <span key={item.label}><i />{item.label}: {item.value}</span>)}</div></div>;
    }

    if (type === 'line') {
      return <div className="mini-line-chart">{data.map((item, index) => <span key={item.label} style={{ height: `${20 + (item.value / max) * 70}%`, left: `${index * 17}%` }} />)}</div>;
    }

    return <div className={`mini-bar-chart ${type === 'vertical' ? 'vertical' : ''}`}>{data.map((item) => <span key={item.label}><b>{item.label}</b><i style={type === 'vertical' ? { height: `${(item.value / max) * 100}%` } : { width: `${(item.value / max) * 100}%` }} /> <em>{item.value}</em></span>)}</div>;
  }

  function renderDashboardWidget(widget, dashboard) {
    const dashboardInvoices = invoices.filter((invoice) => !dashboard?.subAccountName || invoice.subaccount_name === dashboard.subAccountName);
    const paidTotal = dashboardInvoices.reduce((total, invoice) => total + numericValue(invoice.amount_paid), 0);
    const statusCounts = invoiceStatusOptions.reduce((counts, status) => ({
      ...counts,
      [status]: dashboardInvoices.filter((invoice) => String(invoice.status).toLowerCase() === status.toLowerCase()).length
    }), {});
    const dashboardContacts = dashboardContactRows(dashboard);
    const selectedTags = Array.isArray(widget.selectedTags) ? widget.selectedTags : [];
    const contactsBySelectedTags = selectedTags.length
      ? dashboardContacts.filter((contact) => selectedTags.some((tag) => contactTags(contact).includes(tag)))
      : dashboardContacts;

    if (widget.type === 'divider') return <div className="dashboard-divider" style={{ background: widget.color }} />;
    if (widget.type === 'image') return widget.imageUrl ? <img className="dashboard-widget-image" src={widget.imageUrl} alt={widget.title} /> : <div className="dashboard-image-empty">Add an image URL</div>;
    if (widget.type === 'contact-count') return <strong className="numeric-widget-value">{dashboardContacts.length}</strong>;
    if (widget.type === 'contact-count-by-tag') return <strong className="numeric-widget-value">{contactsBySelectedTags.length}</strong>;
    if (widget.type === 'contact-tag-donut') return renderMiniChart(tagCounts(dashboard), 'donut');
    if (widget.type === 'invoice-total') return <strong className="numeric-widget-value">{formatCurrency(paidTotal, selectedCurrency)}</strong>;
    if (widget.type === 'invoice-status') return <div className="mini-status-grid">{invoiceStatusOptions.map((status) => <span key={status}>{status}<b>{statusCounts[status]}</b></span>)}</div>;
    if (widget.type === 'invoice-pie') return renderMiniChart(invoiceStatusOptions.map((status) => ({ label: status, value: statusCounts[status] })), 'pie');
    if (widget.type === 'invoice-vertical-bar') return renderMiniChart(invoiceStatusOptions.map((status) => ({ label: status, value: statusCounts[status] })), 'vertical');
    if (widget.type === 'opportunity-pie') return renderMiniChart([{ label: 'Open', value: opportunities.filter((item) => item.status === 'open').length }, { label: 'Won', value: opportunities.filter((item) => item.status === 'won').length }, { label: 'Lost', value: opportunities.filter((item) => item.status === 'lost').length }], 'pie');
    if (widget.type === 'opportunity-line') return renderMiniChart([{ label: 'W1', value: 2 }, { label: 'W2', value: 4 }, { label: 'W3', value: 3 }, { label: 'W4', value: 6 }], 'line');
    if (widget.type === 'opportunity-count') return <strong className="numeric-widget-value">{opportunities.filter((item) => item.status === 'open').length}</strong>;
    if (widget.type === 'user-count') return <strong className="numeric-widget-value">{users.length}</strong>;
    if (widget.type === 'user-role-bar') return renderMiniChart(['admin', 'user'].map((role) => ({ label: role, value: users.filter((user) => String(user.role).toLowerCase() === role).length })), 'vertical');
    return <p>{widget.content}</p>;
  }

  function renderDashboardCanvas(dashboard, { editable = false } = {}) {
    const layout = { ...defaultDashboardLayout, ...(dashboard.layout || {}) };

    function handleCanvasDrop(event) {
      if (!editable) return;
      event.preventDefault();
      const rect = dashboardCanvasRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.round(event.clientX - rect.left));
      const y = Math.max(0, Math.round(event.clientY - rect.top));
      const transfer = event.dataTransfer.getData('text/plain');
      if (transfer.startsWith('widget:')) addDashboardWidget(transfer.replace('widget:', ''), { x, y });
      if (transfer.startsWith('move:')) updateDashboardWidget(transfer.replace('move:', ''), { x, y });
    }

    return (
      <div
        ref={dashboardCanvasRef}
        className={`dashboard-canvas ${editable ? 'editable' : 'preview'}`}
        onDragOver={(event) => editable && event.preventDefault()}
        onDrop={handleCanvasDrop}
        style={{
          backgroundColor: layout.backgroundColor,
          backgroundImage: layout.backgroundImageUrl ? `url(${layout.backgroundImageUrl})` : 'none'
        }}
      >
        {!dashboard.widgets?.length && <div className="dashboard-empty-canvas">Drag widgets here to start building.</div>}
        {(dashboard.widgets || []).map((widget) => (
          <article
            key={widget.id}
            className={`dashboard-widget ${editable ? 'resizable' : ''} ${['contact-count', 'contact-count-by-tag', 'invoice-total', 'opportunity-count', 'user-count'].includes(widget.type) ? 'numeric-widget' : ''} ${selectedWidgetId === widget.id ? 'selected' : ''}`}
            draggable={editable}
            onDragStart={(event) => event.dataTransfer.setData('text/plain', `move:${widget.id}`)}
            onMouseUp={(event) => {
              if (!editable) return;
              updateDashboardWidget(widget.id, {
                width: Math.round(event.currentTarget.offsetWidth),
                height: Math.round(event.currentTarget.offsetHeight)
              });
            }}
            onClick={() => editable && setSelectedWidgetId(widget.id)}
            style={{
              left: widget.x,
              top: widget.y,
              width: widget.width,
              height: widget.height,
              background: widget.color,
              color: widget.textColor
            }}
          >
            {editable && <div className="widget-drag-handle">Drag</div>}
            <h3>{widget.title}</h3>
            {renderDashboardWidget(widget, dashboard)}
            {editable && (
              <div className="widget-actions">
                <button type="button" onClick={(event) => { event.stopPropagation(); duplicateDashboardWidget(widget.id); }}>Duplicate</button>
                <button type="button" className="danger-button" onClick={(event) => { event.stopPropagation(); deleteDashboardWidget(widget.id); }}>Delete</button>
              </div>
            )}
          </article>
        ))}
      </div>
    );
  }

  function renderDashboardEditor() {
    const selectedWidget = editorDashboard?.widgets?.find((widget) => widget.id === selectedWidgetId);
    const existingDashboards = dashboards.filter((dashboard) => dashboard.isActive !== false);

    return (
      <>
        <div className="page-title-row">
          <div>
            <p className="eyebrow">Settings</p>
            <h1>Dashboard Editor</h1>
            <p>Create subaccount-specific dashboards with draggable, configurable widgets.</p>
          </div>
          {editorDashboard && <button type="button" onClick={() => saveEditorDashboard()}>Save</button>}
        </div>

        <div className="dashboard-create-panel panel">
          <form onSubmit={createCustomDashboard}>
            <label>Subaccount
              <CustomSelect
                value={dashboardForm.subAccountId}
                onChange={(subAccountId) => setDashboardForm({ ...dashboardForm, subAccountId })}
                placeholder="Select Subaccount"
                options={subAccounts.map((subAccount) => ({ value: subAccount.id, label: subAccount.name }))}
              />
            </label>
            <label>Dashboard Name
              <input value={dashboardForm.name} onChange={(event) => setDashboardForm({ ...dashboardForm, name: event.target.value })} placeholder="Sales Overview" />
            </label>
            <button disabled={loading}>{loading ? 'Creating...' : 'Create Dashboard'}</button>
          </form>
          {!!existingDashboards.length && (
            <div className="existing-dashboard-row">
              <span>Edit existing:</span>
              {existingDashboards.map((dashboard) => <button type="button" className="ghost-button" key={dashboard.id} onClick={() => { setEditorDashboard(normalizeDashboard(dashboard)); setSelectedWidgetId(''); }}>{dashboard.name}</button>)}
            </div>
          )}
        </div>

        {editorDashboard && (
          <div className="dashboard-editor-shell">
            <section className="dashboard-editor-main">
              <div className="dashboard-editor-bar">
                <input value={editorDashboard.name} onChange={(event) => updateEditorDashboard({ name: event.target.value })} />
                <span>{editorDashboard.subAccountName}</span>
                <button type="button" className="ghost-button" onClick={() => setDashboardPreview((isPreview) => !isPreview)}>{dashboardPreview ? 'Edit' : 'Preview'}</button>
              </div>
              {renderDashboardCanvas(editorDashboard, { editable: !dashboardPreview })}
            </section>

            <aside className="dashboard-toolbox">
              <h2>Toolbox</h2>
              <p>Drag widgets onto the canvas.</p>
              {dashboardWidgetFolders.map((folder) => (
                <div className="widget-folder" key={folder.id}>
                  <button type="button" className="widget-folder-title" onClick={() => setOpenWidgetFolders((current) => ({ ...current, [folder.id]: !current[folder.id] }))}>
                    {folder.label}
                    <span>{openWidgetFolders[folder.id] ? '−' : '+'}</span>
                  </button>
                  {openWidgetFolders[folder.id] && (
                    <div className="widget-folder-list">
                      {folder.widgets.map((widget) => (
                        <button key={widget.type} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', `widget:${widget.type}`)} onClick={() => addDashboardWidget(widget.type)}>
                          {widget.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="toolbox-section">
                <h3>Dashboard Background</h3>
                <label>Color<input type="color" value={editorDashboard.layout?.backgroundColor || defaultDashboardLayout.backgroundColor} onChange={(event) => updateDashboardLayout({ backgroundColor: event.target.value })} /></label>
                <label>Image URL<input value={editorDashboard.layout?.backgroundImageUrl || ''} onChange={(event) => updateDashboardLayout({ backgroundImageUrl: event.target.value })} placeholder="https://..." /></label>
              </div>

              {selectedWidget && (
                <div className="toolbox-section">
                  <h3>Selected Widget</h3>
                  <label>Title<input value={selectedWidget.title} onChange={(event) => updateDashboardWidget(selectedWidget.id, { title: event.target.value })} /></label>
                  <label>Content<textarea value={selectedWidget.content || ''} onChange={(event) => updateDashboardWidget(selectedWidget.id, { content: event.target.value })} /></label>
                  <label>Image URL<input value={selectedWidget.imageUrl || ''} onChange={(event) => updateDashboardWidget(selectedWidget.id, { imageUrl: event.target.value })} /></label>
                  <div className="size-grid">
                    <label>Width<input type="number" value={selectedWidget.width} onChange={(event) => updateDashboardWidget(selectedWidget.id, { width: Number(event.target.value) })} /></label>
                    <label>Height<input type="number" value={selectedWidget.height} onChange={(event) => updateDashboardWidget(selectedWidget.id, { height: Number(event.target.value) })} /></label>
                  </div>
                  <div className="size-grid">
                    <label>Box Color<input type="color" value={selectedWidget.color || '#ffffff'} onChange={(event) => updateDashboardWidget(selectedWidget.id, { color: event.target.value })} /></label>
                    <label>Text Color<input type="color" value={selectedWidget.textColor || '#172033'} onChange={(event) => updateDashboardWidget(selectedWidget.id, { textColor: event.target.value })} /></label>
                  </div>
                  {selectedWidget.type === 'contact-count-by-tag' && (
                    <div className="tag-picker">
                      <h3>Contact Tags</h3>
                      {uniqueContactTags(editorDashboard).map((tag) => {
                        const selectedTags = Array.isArray(selectedWidget.selectedTags) ? selectedWidget.selectedTags : [];
                        const checked = selectedTags.includes(tag);
                        return (
                          <label key={tag}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => updateDashboardWidget(selectedWidget.id, {
                                selectedTags: checked ? selectedTags.filter((item) => item !== tag) : [...selectedTags, tag]
                              })}
                            />
                            {tag}
                          </label>
                        );
                      })}
                      {!uniqueContactTags(editorDashboard).length && <p>No tags found for this subaccount yet.</p>}
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        )}
      </>
    );
  }

  function renderCustomDashboardView(dashboardId) {
    const dashboard = dashboards.find((item) => item.id === dashboardId);
    if (!dashboard) {
      return <div className="panel placeholder-panel"><p className="eyebrow">Invoices</p><h1>Dashboard not found</h1><p>This dashboard may still be loading or may have been removed.</p></div>;
    }

    return (
      <>
        <div className="page-title-row">
          <div>
            <p className="eyebrow">Invoices / Custom Dashboard</p>
            <h1>{dashboard.name}</h1>
            <p>Linked subaccount: {dashboard.subAccountName}. Widgets only use this subaccount context.</p>
          </div>
          <button type="button" onClick={() => { setEditorDashboard(normalizeDashboard(dashboard)); setActivePage('dashboard-editor'); }}>Edit Dashboard</button>
        </div>
        {renderDashboardCanvas(dashboard, { editable: false })}
      </>
    );
  }

  function renderCustomization() {
    const palette = Array.isArray(customForm.colorPalette) ? customForm.colorPalette : defaultCustomization.colorPalette;
    return (
      <div className="panel form-panel wide-form customization-panel">
        <div className="panel-header compact"><div><p className="eyebrow">Settings</p><h1>Customization</h1><p>Store app colors, fonts, background images, and palettes in PostgreSQL.</p></div></div>
        <form onSubmit={saveCustomization}>
          <label>Application Name<input value={customForm.appName} onChange={(event) => setCustomForm({ ...customForm, appName: event.target.value })} /></label>
          <div className="color-grid">
            {[
              ['primaryColor', 'Primary Color'], ['secondaryColor', 'Secondary Color'], ['accentColor', 'Accent Color'], ['backgroundColor', 'Background Color'], ['surfaceColor', 'Surface Color'], ['textColor', 'Text Color']
            ].map(([key, label]) => <label key={key}>{label}<input type="color" value={customForm[key]} onChange={(event) => setCustomForm({ ...customForm, [key]: event.target.value })} /></label>)}
          </div>
          <div className="font-grid">
            <label>Main Font Family<input value={customForm.fontFamily} onChange={(event) => setCustomForm({ ...customForm, fontFamily: event.target.value })} /></label>
            <label>Sidepanel Font Family<input value={customForm.sidepanelFontFamily} onChange={(event) => setCustomForm({ ...customForm, sidepanelFontFamily: event.target.value })} /></label>
            <label>Column Field Font Family<input value={customForm.columnFontFamily} onChange={(event) => setCustomForm({ ...customForm, columnFontFamily: event.target.value })} /></label>
          </div>
          <label>Background Image URL<input value={customForm.backgroundImageUrl} onChange={(event) => setCustomForm({ ...customForm, backgroundImageUrl: event.target.value })} placeholder="https://..." /></label>
          <label>Color Palette, comma separated<input value={customForm.colorPaletteInput ?? palette.join(', ')} onChange={(event) => setCustomForm({ ...customForm, colorPaletteInput: event.target.value })} /></label>
          <div className="palette-row">{palette.map((color) => <span key={color} style={{ background: color }} title={color} />)}</div>
          <button disabled={loading}>{loading ? 'Saving...' : 'Save Customization'}</button>
        </form>
      </div>
    );
  }

  function renderAuditLogs() {
    const auditColumns = [
      { key: 'created_at', label: 'Created At' },
      { key: 'event_type', label: 'Event Type', render: (row) => <StatusBadge value={row.event_type} /> },
      { key: 'contact_id', label: 'Contact ID' },
      { key: 'sub_account_id', label: 'Sub Account ID' },
      { key: 'payload', label: 'Payload Preview', render: (row) => <code className="payload-preview">{JSON.stringify(row.payload).slice(0, 180)}</code> }
    ];

    function applyAuditFilters(event) {
      event.preventDefault();
      loadAuditLogs(auditFilters).catch((error) => setMessage(error.message));
    }

    return (
      <>
        <div className="page-title-row"><div><p className="eyebrow">Settings</p><h1>Audit Logs</h1><p>Review meaningful application activity like settings changes, exports, syncs, user events, and webhook failures.</p></div><button onClick={() => loadAuditLogs()}>Refresh</button></div>
        <form className="filter-bar" onSubmit={applyAuditFilters}>
          <label>Event Type<input value={auditFilters.eventType} onChange={(event) => setAuditFilters({ ...auditFilters, eventType: event.target.value })} placeholder="SettingsUpdate" /></label>
          <label>Related Contact ID<input value={auditFilters.contactId} onChange={(event) => setAuditFilters({ ...auditFilters, contactId: event.target.value })} /></label>
          <label>From<input type="datetime-local" value={auditFilters.dateFrom} onChange={(event) => setAuditFilters({ ...auditFilters, dateFrom: event.target.value })} /></label>
          <label>To<input type="datetime-local" value={auditFilters.dateTo} onChange={(event) => setAuditFilters({ ...auditFilters, dateTo: event.target.value })} /></label>
          <button type="submit">Apply Filters</button>
          <button type="button" className="ghost-button" onClick={() => { const empty = { eventType: '', contactId: '', dateFrom: '', dateTo: '' }; setAuditFilters(empty); loadAuditLogs(empty).catch((error) => setMessage(error.message)); }}>Clear</button>
        </form>
        <DataTable columns={auditColumns} rows={auditLogs} rowKey="id" emptyText="No logs found for these filters." />
      </>
    );
  }

  function renderPlaceholder(title, description) {
    return <div className="panel placeholder-panel"><p className="eyebrow">Settings</p><h1>{title}</h1><p>{description}</p><div className="placeholder-card">This page shell is ready for the next implementation step.</div></div>;
  }

  function renderSettingsContent(sectionId) {
    if (sectionId === 'employee-management') return renderEmployeeManagement();
    if (sectionId === 'customization') return renderCustomization();
    if (sectionId === 'user-management') return renderPlaceholder('User Management', 'Manage app-level users, permissions, and account access.');
    if (sectionId === 'dashboard-editor') return renderDashboardEditor();
    if (sectionId === 'notifications') return renderPlaceholder('Notification Settings', 'Configure alerts for sync failures, webhook events, and invoice changes.');
    if (sectionId === 'api-webhooks') return renderPlaceholder('API Key & Webhook Page', 'Manage CRM keys, production webhook URLs, and integration status.');
    if (sectionId === 'audit-logs') return renderAuditLogs();
    return renderEmployeeManagement();
  }

  function renderRefreshButton() {
    return <button onClick={refreshAll} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>;
  }

  function renderPage() {
    if (activePage === 'dashboard') return renderDashboard();
    if (activePage === 'database') return renderDatabasePage();
    if (activePage === 'invoices') return renderInvoicesPage();
    if (String(activePage).startsWith('dashboard-view:')) return renderCustomDashboardView(activePage.replace('dashboard-view:', ''));
    if (settingsPageIds.has(activePage)) return renderSettingsContent(activePage);
    return renderDashboard();
  }

  const mainNavItems = navItems.filter((item) => !item.group);

  return (
    <main className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`} style={appStyle}>
      <aside className="sidebar">
        <div className="brand-row"><img src={logo} alt="Zea Board" /><div><strong>Zea Board</strong><span>Admin Console</span></div></div>
        <button className="collapse-button" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? '‹' : '›'}</button>
        <div className="nav-group">
          <p>Main</p>
          {mainNavItems.map((item) => <button key={item.id} className={activePage === item.id ? 'active' : ''} onClick={() => setActivePage(item.id)}><span><Icon name={item.icon} /></span><b>{item.label}</b></button>)}
          {dashboards.map((dashboard) => (
            <button key={dashboard.id} className={activePage === `dashboard-view:${dashboard.id}` ? 'active' : ''} onClick={() => setActivePage(`dashboard-view:${dashboard.id}`)}>
              <span><Icon name="dashboard" /></span>
              <b>{dashboard.name}</b>
            </button>
          ))}
          <div className="settings-flyout-wrap" ref={settingsFlyoutRef}>
            <button className={settingsPageIds.has(activePage) ? 'active' : ''} onClick={() => setSettingsMenuOpen((isOpen) => !isOpen)}>
              <span><Icon name="editor" /></span>
              <b>Settings</b>
            </button>
            {settingsMenuOpen && (
              <div className="settings-submenu">
                {settingsItems.map((item) => (
                  <button key={item.id} className={activePage === item.id ? 'active' : ''} onClick={() => { setActivePage(item.id); setSettingsMenuOpen(false); }}>
                    <span><Icon name={item.icon} /></span>
                    <b>{item.label}</b>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="search-box"><UiIcon name="search" /> <span>Search records, invoices, contacts...</span></div>
          <div className="topbar-actions"><span>{new Date().toLocaleDateString()}</span><button onClick={refreshAll}>Sync View</button></div>
        </header>
        {message && <p className="status-message">{message}</p>}
        {activePage === 'database' && renderAddSubAccountCard()}
        {renderPage()}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
