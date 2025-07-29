interface RecipePlaceholderProps {
  className?: string;
  title?: string;
}

export default function RecipePlaceholder({ className = "", title }: RecipePlaceholderProps) {
  return (
    <div className={`bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ${className}`}>
      <div className="text-center">
        <svg 
          width="64" 
          height="64" 
          viewBox="0 0 24 24" 
          fill="none" 
          className="mx-auto mb-2 text-gray-400 dark:text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Plate */}
          <ellipse 
            cx="12" 
            cy="18" 
            rx="8" 
            ry="2" 
            fill="currentColor" 
            opacity="0.2"
          />
          <ellipse 
            cx="12" 
            cy="17.5" 
            rx="7" 
            ry="1.5" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            fill="none"
          />
          
          {/* Fork */}
          <path 
            d="M6 4V12M6 4L5 4M6 4L7 4M6 8L5 8M6 8L7 8" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
          
          {/* Knife */}
          <path 
            d="M18 4V12M18 4L17.5 4.5M18 4L18.5 4.5" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
          
          {/* Food items on plate */}
          <circle 
            cx="10" 
            cy="15" 
            r="1.5" 
            fill="currentColor" 
            opacity="0.4"
          />
          <circle 
            cx="14" 
            cy="15" 
            r="1" 
            fill="currentColor" 
            opacity="0.4"
          />
          <ellipse 
            cx="12" 
            cy="13" 
            rx="2" 
            ry="1" 
            fill="currentColor" 
            opacity="0.3"
          />
        </svg>
        {title && (
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium px-4 leading-tight">
            {title}
          </p>
        )}
      </div>
    </div>
  );
}