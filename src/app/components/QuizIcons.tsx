// Playful custom quiz icons for the loading animation

interface IconProps {
  size?: number;
  className?: string;
}

export const PlayfulQuestionMark = ({ size = 32, className = "" }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ transform: 'rotate(-5deg)' }}
  >
    <path
      d="M9 9C9 7.34315 10.3431 6 12 6C13.6569 6 15 7.34315 15 9C15 10.3062 14.1652 11.4175 13 11.8293V13"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="13"
      cy="17"
      r="1"
      fill="currentColor"
    />
  </svg>
);

export const PlayfulPencil = ({ size = 28, className = "" }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ transform: 'rotate(10deg)' }}
  >
    <path
      d="M18 2L22 6L12 16L8 17L9 13L19 3L18 2Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.2"
    />
    <path
      d="M8 17L4 21"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlayfulCheckMark = ({ size = 30, className = "" }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ transform: 'rotate(5deg)' }}
  >
    <path
      d="M5 13L9 17L19 7"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlayfulExclamation = ({ size = 26, className = "" }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ transform: 'rotate(-8deg)' }}
  >
    <path
      d="M12 4V14"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="19"
      r="1.5"
      fill="currentColor"
    />
  </svg>
);
