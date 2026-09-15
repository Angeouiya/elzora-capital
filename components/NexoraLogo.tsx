interface NexoraLogoProps {
  size?: number;
  className?: string;
}

export function NexoraLogo({ size = 32, className = "" }: NexoraLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width="40" height="40" rx="10" fill="#B6FF00" />
      {/* Stylized "N" lettermark */}
      <path
        d="M11 29V11h3.2l9.6 12.4V11H27v18h-3.2L14.2 16.6V29H11z"
        fill="#1a1c1b"
      />
      {/* Growth arrow accent */}
      <path
        d="M28.5 14.5L31 12l-1.5-1.5-4 4 1.5 1.5L28.5 14.5z"
        fill="#1a1c1b"
        opacity="0.6"
      />
    </svg>
  );
}

export function NexoraLogoDark({ size = 32, className = "" }: NexoraLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="10" fill="#1a1c1b" />
      <path
        d="M11 29V11h3.2l9.6 12.4V11H27v18h-3.2L14.2 16.6V29H11z"
        fill="#B6FF00"
      />
      <path
        d="M28.5 14.5L31 12l-1.5-1.5-4 4 1.5 1.5L28.5 14.5z"
        fill="#B6FF00"
        opacity="0.6"
      />
    </svg>
  );
}
