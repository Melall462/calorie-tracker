// Small stroke icons for the bottom navigation.
const PATHS = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h13V10" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  scale: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="4" />
      <path d="M8.5 10a3.5 3.5 0 0 1 7 0" />
      <path d="m12 10 1.8-1.8" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" />
    </>
  ),
};

export default function Icon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
