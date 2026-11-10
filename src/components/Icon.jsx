// Small stroke icons for the bottom navigation.
const PATHS = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h13V10" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  meals: (
    <>
      <path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z" />
      <path d="M9 8.5c0-1.6 1.3-1.6 1.3-3.2" />
      <path d="M14 8.5c0-1.6 1.3-1.6 1.3-3.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
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
