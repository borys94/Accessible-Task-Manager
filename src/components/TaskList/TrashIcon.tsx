// Decorative: the button around it is named by its own text, so the icon is hidden from assistive
// technologies. fill="currentColor" keeps it visible in Windows High Contrast / forced colors mode,
// where background images and fixed colours are replaced.
function TrashIcon() {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

export default TrashIcon;
