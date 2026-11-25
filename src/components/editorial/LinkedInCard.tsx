import { PROFILE } from "@content/profile";

/** LinkedIn has no public profile API, so the card is drawn from PROFILE. */
export function LinkedInCard() {
  return (
    <div className="contact-card__body">
      <p className="contact-card__head">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="contact-card__mark"
        >
          <rect width="16" height="16" rx="2" fill="#0A66C2" />
          <path
            fill="#fff"
            d="M3.6 6.2h2v6.4h-2zM4.6 3.2a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3M6.9 6.2h1.9v.9c.27-.5.92-1.05 1.9-1.05 2 0 2.4 1.33 2.4 3.05v3.5h-2V9.5c0-.74-.01-1.7-1.03-1.7-1.04 0-1.2.81-1.2 1.64v3.16h-2z"
          />
        </svg>
        {PROFILE.name}
      </p>
      <p className="contact-card__line">{PROFILE.jobTitle}</p>
      <p className="contact-card__meta">{PROFILE.location.city} · linkedin.com/in/someshks</p>
    </div>
  );
}
