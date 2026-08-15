import {
  Bell,
  Bookmark,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Dumbbell,
  HeartPulse,
  History,
  Home,
  Plus,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  ReactNode,
} from 'react';
import { NavLink } from 'react-router-dom';

export const BrandMark = ({ compact = false }: { compact?: boolean }) => (
  <span className={`brand ${compact ? 'brand--compact' : ''}`}>
    <svg className="brand__mark" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M4 32 18 6h7L12 32H4Z" />
      <path d="m16 32 9-17 11 17h-8l-3-5-3 5h-6Z" opacity="0.72" />
      <path d="m18 32 7-11 7 11h-6l-1-2-1 2h-6Z" opacity="0.42" />
    </svg>
    <span className="brand__name">AdaptFit</span>
  </span>
);

export const StatusBar = () => (
  <div className="status-bar" aria-hidden="true">
    <span>9:41</span>
    <span className="status-bar__signals">● ◒ ▰</span>
  </div>
);

export const AppHeader = ({ action = 'bookmark' }: { action?: 'bookmark' | 'bell' | 'none' }) => (
  <>
    <StatusBar />
    <header className="app-header">
      <NavLink to="/dashboard" aria-label="Go to dashboard">
        <BrandMark />
      </NavLink>
      {action !== 'none' ? (
        <NavLink
          className="icon-button"
          to={action === 'bell' ? '/dashboard' : '/exercises?saved=1'}
          aria-label={action === 'bell' ? 'Dashboard updates' : 'Saved exercises'}
        >
          {action === 'bell' ? <Bell size={21} /> : <Bookmark size={21} />}
        </NavLink>
      ) : null}
    </header>
  </>
);

export const Page = ({
  children,
  wide = false,
  className = '',
}: PropsWithChildren<{ wide?: boolean; className?: string }>) => (
  <main className={`page ${wide ? 'page--wide' : ''} ${className}`} tabIndex={-1}>
    {children}
  </main>
);

export const PageIntro = ({
  title,
  subtitle,
  centered = false,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: string;
  centered?: boolean;
  eyebrow?: string;
}) => (
  <div className={`page-intro ${centered ? 'page-intro--centered' : ''}`}>
    {eyebrow !== undefined ? <p className="eyebrow">{eyebrow}</p> : null}
    <h1>{title}</h1>
    {subtitle !== undefined ? <p>{subtitle}</p> : null}
  </div>
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'default' | 'compact';
  icon?: ReactNode;
  loading?: boolean;
};

export const Button = ({
  variant = 'primary',
  size = 'default',
  icon,
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) => (
  <button
    className={`button button--${variant} button--${size} ${className}`}
    disabled={disabled === true || loading}
    {...props}
    aria-busy={loading}
  >
    {loading ? (
      <>
        <span className="button__loader" aria-hidden="true" />
        <span aria-hidden="true">Please wait</span>
        <span className="sr-only">
          {children}
          {', in progress'}
        </span>
      </>
    ) : (
      <>
        {icon}
        <span>{children}</span>
      </>
    )}
  </button>
);

export const IconButton = ({
  label,
  active = false,
  children,
  className = '',
  ...props
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }
>) => (
  <button
    className={`icon-button ${active ? 'is-active' : ''} ${className}`}
    aria-label={label}
    aria-pressed={active}
    {...props}
  >
    {children}
  </button>
);

export const BookmarkButton = ({
  active,
  onClick,
  label = 'Save exercise',
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
}) => (
  <IconButton label={active ? 'Remove saved exercise' : label} active={active} onClick={onClick}>
    <Bookmark size={21} fill={active ? 'currentColor' : 'none'} />
  </IconButton>
);

export const Surface = ({
  children,
  className = '',
  as = 'section',
}: PropsWithChildren<{ className?: string; as?: 'section' | 'article' | 'div' }>) => {
  const Component = as;
  return <Component className={`surface ${className}`}>{children}</Component>;
};

export const SearchField = ({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) => (
  <label className={`search-field ${className}`}>
    <Search size={20} aria-hidden="true" />
    <span className="sr-only">Search</span>
    <input type="search" {...props} />
  </label>
);

export const Chip = ({
  active = false,
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }>) => (
  <button className={`chip ${active ? 'is-active' : ''}`} aria-pressed={active} {...props}>
    {children}
  </button>
);

export const Tag = ({
  children,
  tone = 'accent',
}: PropsWithChildren<{ tone?: 'accent' | 'neutral' | 'warning' | 'success' }>) => (
  <span className={`tag tag--${tone}`}>{children}</span>
);

export const MetricTile = ({
  icon,
  label,
  value,
  note,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  note?: string;
}) => (
  <div className="metric-tile">
    {icon !== undefined ? <span className="metric-tile__icon">{icon}</span> : null}
    <span className="metric-tile__label">{label}</span>
    <strong>{value}</strong>
    {note !== undefined ? <small>{note}</small> : null}
  </div>
);

export const Callout = ({
  icon = <Sparkles size={21} />,
  title,
  children,
  tone = 'info',
}: PropsWithChildren<{
  icon?: ReactNode;
  title?: string;
  tone?: 'info' | 'warning' | 'success';
}>) => (
  <aside className={`callout callout--${tone}`}>
    <span className="callout__icon">{icon}</span>
    <div>
      {title !== undefined ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  </aside>
);

export const BottomNav = () => {
  const links = [
    { to: '/dashboard', label: 'Home', icon: Home },
    { to: '/exercises', label: 'Workouts', icon: Dumbbell },
    { to: '/discover', label: 'Build', icon: Plus, featured: true },
    { to: '/history', label: 'Progress', icon: ChartNoAxesColumnIncreasing },
    { to: '/profile/summary', label: 'Profile', icon: UserRound },
  ];
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {links.map(({ to, label, icon: Icon, featured }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `${isActive ? 'is-active' : ''} ${featured ? 'bottom-nav__featured' : ''}`
          }
        >
          <Icon size={featured ? 27 : 21} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <span className={`skeleton ${className}`} aria-hidden="true" />
);

export const EmptyState = ({
  title,
  children,
  action,
  headingLevel = 'h2',
}: PropsWithChildren<{
  title: string;
  action?: ReactNode;
  headingLevel?: 'h1' | 'h2';
}>) => {
  const Heading = headingLevel;

  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <HeartPulse size={30} />
      </span>
      <Heading>{title}</Heading>
      <div>{children}</div>
      {action}
    </div>
  );
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatShortDate = (value: string): string =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  );

export const ContextIcon = ({ type }: { type: 'history' | 'plan' | 'calendar' }) => {
  if (type === 'history') return <History size={20} />;
  if (type === 'calendar') return <CalendarDays size={20} />;
  return <Sparkles size={20} />;
};
