import clsx from 'clsx';

interface ChatIconProps {
  onClick: () => void;
  isOpen: boolean;
  className?: string;
}

export function ChatIcon({ onClick, isOpen, className }: ChatIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
      aria-expanded={isOpen}
      className={clsx(
        'relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200',
        'hover:scale-105 active:scale-95',
        isOpen
          ? 'bg-brand-700 text-white shadow-brand-600/30'
          : 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-brand-500/25 hover:shadow-xl',
        className,
      )}
    >
      {isOpen ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-300" />
        </>
      )}
    </button>
  );
}
