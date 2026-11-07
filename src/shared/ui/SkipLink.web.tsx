export function SkipLink() {
  return (
    <nav aria-label="바로가기">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        본문 바로가기
      </a>
    </nav>
  );
}
