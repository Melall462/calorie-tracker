import { legalConfig } from '../legal/config.js';
import { buildPrivacyPolicy } from '../legal/privacy.js';

// The privacy policy page. It is shown instead of the app whenever the address ends in #privacy, so it has a link of its own.
export default function PrivacyPolicy({ onClose, config = legalConfig }) {
  const policy = buildPrivacyPolicy(config);
  return (
    <>
      <header className="app-header">
        <span className="wordmark">Nutrily</span>
      </header>
      <main className="legal">
        <button className="link-btn start" onClick={onClose}>
          Back to Nutrily
        </button>
        <h1>{policy.title}</h1>
        <p className="muted small">Last updated {policy.updated}</p>
        <p>{policy.intro}</p>
        {policy.sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
            <h2 id={`${section.id}-title`}>{section.title}</h2>
            {section.blocks.map((block, i) => {
              if (typeof block === 'string') return <p key={i}>{block}</p>;
              if (block.list) {
                return (
                  <ul key={i}>
                    {block.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i}>
                  {policy.contactEmail ? (
                    <>
                      Questions, requests to see or correct your information, or help with deleting your account: email{' '}
                      <a href={`mailto:${policy.contactEmail}`}>{policy.contactEmail}</a>.
                    </>
                  ) : (
                    policy.contact
                  )}
                </p>
              );
            })}
          </section>
        ))}
        <button className="btn secondary" onClick={onClose}>
          Back to Nutrily
        </button>
      </main>
    </>
  );
}
