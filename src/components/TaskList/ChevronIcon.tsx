// Decorative: the expanded state is exposed by aria-expanded on the button. The chevron is rotated
// in CSS from the same attribute, so what is seen and what is announced cannot drift apart.
function ChevronIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z" />
    </svg>
  );
}

export default ChevronIcon;
