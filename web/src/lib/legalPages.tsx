/**
 * Shared legal / policy page content for the AutoBlog network sites.
 *
 * These pages exist mainly to satisfy Google AdSense's "necessary pages"
 * requirement (About, Contact, Privacy Policy, Terms, Disclaimer). The Privacy
 * Policy is written to meet AdSense's specific disclosure rules: third-party /
 * Google advertising cookies, the DoubleClick DART cookie, personalised ads and
 * the opt-out links. Content is plain semantic HTML so it renders correctly
 * inside every site's `.article-content` prose container.
 */
import type { ReactNode } from "react";
import type { Site } from "@/lib/types";

export const contactEmail = (site: Site) => `contact@${site.domain}`;

const monthYear = () =>
  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" });

export function aboutContent(site: Site): ReactNode {
  return (
    <>
      <p>
        {site.name} is an independent online resource. We publish clearly written guides, data reports
        and reference pages to help readers understand a complex topic quickly and make better-informed
        decisions.
      </p>
      <h2>What we do</h2>
      <p>
        Our editorial team researches public sources, official figures and provider information, then
        summarises it into accessible articles and tools. Every page aims to be genuinely useful,
        accurate at the time of writing, and easy to act on.
      </p>
      <h2>Our approach</h2>
      <ul>
        <li><strong>Independent</strong> — we are not affiliated with any government body, and our editorial choices are our own.</li>
        <li><strong>Sourced</strong> — figures and claims are drawn from public data and provider pages, and we link to sources where possible.</li>
        <li><strong>Honest</strong> — where numbers are estimates rather than official quotes, we say so plainly.</li>
      </ul>
      <h2>Who we are</h2>
      <p>
        {site.name} is operated by an independent publisher. We fund the site through advertising and,
        occasionally, affiliate links, which lets us keep the content free to read.
      </p>
      <h2>Get in touch</h2>
      <p>
        Questions, corrections or feedback are welcome — please use our{" "}
        <a href={`/s/${site.id}/contact`}>contact page</a>. We especially appreciate source links and
        updated figures for any of our reports.
      </p>
    </>
  );
}

export function privacyContent(site: Site): ReactNode {
  return (
    <>
      <p>Last updated: {monthYear()}.</p>
      <p>
        {site.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) respects your privacy. This
        policy explains what we collect, how we use it, and the choices you have. By using {site.domain}{" "}
        you agree to this policy.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Usage data</strong> — aggregated, non-identifying analytics such as page views, approximate country, referrer and device type.</li>
        <li><strong>Cookies &amp; local storage</strong> — small files used to run the site, measure traffic and (via our advertising partners) serve relevant ads.</li>
        <li><strong>Information you provide</strong> — e.g. the email address or message you submit if you contact us or subscribe.</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To operate and improve the site, understand which content is useful, respond to your messages,
        and display advertising that helps keep the site free. We do <strong>not</strong> sell your
        personal information.
      </p>

      <h2>Advertising &amp; Google AdSense</h2>
      <p>
        We use third-party advertising companies, including <strong>Google</strong>, to serve ads when
        you visit {site.name}. These companies may use information about your visits to this and other
        websites (not including your name, address, email address or telephone number) in order to
        provide advertisements about goods and services of interest to you.
      </p>
      <ul>
        <li>
          Third-party vendors, including Google, use cookies to serve ads based on your prior visits to
          this website or other websites.
        </li>
        <li>
          Google&apos;s use of advertising cookies — including the <strong>DoubleClick DART cookie</strong> —
          enables it and its partners to serve ads to you based on your visit to our site and/or other
          sites on the internet.
        </li>
        <li>
          You may opt out of personalised advertising by visiting{" "}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.
          You can also opt out of a third-party vendor&apos;s use of cookies for personalised advertising at{" "}
          <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info</a>.
        </li>
        <li>
          For more on how Google uses data when you use our partners&apos; sites, see{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
            Google&apos;s privacy &amp; terms
          </a>.
        </li>
      </ul>

      <h2>Analytics</h2>
      <p>
        We use privacy-respecting analytics (such as Google Analytics and our hosting provider&apos;s edge
        analytics) to understand aggregate traffic. These tools may set cookies; the data is used in
        aggregate and is not used to identify you personally.
      </p>

      <h2>Consent (EEA/UK visitors)</h2>
      <p>
        If you are in the European Economic Area or the United Kingdom, we (and our advertising partners)
        rely on your consent to use non-essential cookies for advertising and analytics. Where required,
        a consent notice is shown, and you can change or withdraw your choices at any time through your
        browser settings or the ad-settings links above.
      </p>

      <h2>Your choices</h2>
      <p>
        You can block or delete cookies in your browser settings, opt out of personalised ads via the
        links above, and unsubscribe from any email at any time. To request access to or deletion of
        information you have sent us, contact us via the{" "}
        <a href={`/s/${site.id}/contact`}>contact page</a>.
      </p>

      <h2>Children</h2>
      <p>{site.name} is a general-audience information site and is not directed at children under 13.</p>

      <h2>Changes</h2>
      <p>We may update this policy from time to time; the &ldquo;last updated&rdquo; date above will change accordingly.</p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email{" "}
        <a href={`mailto:${contactEmail(site)}`}>{contactEmail(site)}</a> or use our{" "}
        <a href={`/s/${site.id}/contact`}>contact page</a>.
      </p>
    </>
  );
}

export function termsContent(site: Site): ReactNode {
  return (
    <>
      <p>Last updated: {monthYear()}.</p>
      <p>By accessing or using {site.name} ({site.domain}), you agree to these terms.</p>

      <h2>Information only — not professional advice</h2>
      <p>
        The content, statistics, rankings and figures on {site.name} are compiled from public sources and
        provided for <strong>general information only</strong>. They may contain errors or be out of date,
        and are <strong>not</strong> financial, investment, legal, immigration or other professional
        advice. Always verify against the original/official source before relying on or citing any figure.
      </p>

      <h2>No warranty</h2>
      <p>
        The site is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any
        kind. We do not guarantee that the information is accurate, complete or current, and we are not
        liable for any loss or damage arising from your use of the site.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You may read and share our pages with a link. You may not scrape, copy or republish the site
        wholesale, attempt to disrupt the service, or use it for any unlawful purpose.
      </p>

      <h2>Intellectual property</h2>
      <p>The site&apos;s design and original content are ours or our licensors&apos;. Trademarks and data belong to their respective owners.</p>

      <h2>Advertising &amp; external links</h2>
      <p>
        The site displays third-party advertising and links to external sources and tools. We are not
        responsible for the content, products or policies of third parties. See our{" "}
        <a href={`/s/${site.id}/privacy`}>Privacy Policy</a> for how advertising cookies are used.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms at any time. Continued use of the site means you accept the current version.</p>

      <h2>Contact</h2>
      <p>Questions? See our <a href={`/s/${site.id}/contact`}>contact page</a>.</p>
    </>
  );
}

export function disclaimerContent(site: Site): ReactNode {
  return (
    <>
      <p>Last updated: {monthYear()}.</p>

      <h2>General information</h2>
      <p>
        All information on {site.name} is published in good faith and for general information purposes
        only. {site.name} makes no representation or warranty, express or implied, about the accuracy,
        adequacy, validity, reliability or completeness of any information on the site.
      </p>

      <h2>Estimates, not official quotes</h2>
      <p>
        Many figures on this site — prices, salaries, costs, rankings and similar data — are{" "}
        <strong>best-available estimates modelled from public sources</strong>, not official quotes for
        any specific product, job or individual. They can change at any time. Always confirm the current,
        official figure with the relevant provider, employer, government body or embassy before you act on
        it or spend money.
      </p>

      <h2>Not professional advice</h2>
      <p>
        Nothing on {site.name} constitutes financial, investment, legal, tax, immigration or other
        professional advice. You should consult a qualified professional before making decisions based on
        the content here.
      </p>

      <h2>External links</h2>
      <p>
        {site.name} may contain links to other websites and third-party advertising. We do not control and
        are not responsible for the content, accuracy or practices of those third-party sites.
      </p>

      <h2>Your responsibility</h2>
      <p>
        Any reliance you place on the information on this site is strictly at your own risk. We are not
        liable for any loss or damage arising from the use of this website.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this disclaimer? Email{" "}
        <a href={`mailto:${contactEmail(site)}`}>{contactEmail(site)}</a>.
      </p>
    </>
  );
}

export function contactContent(site: Site): ReactNode {
  return (
    <>
      <p>
        Questions, a correction to a figure, a source link, or feedback? We&apos;d love to hear from you and
        we read every message.
      </p>
      <p>
        <strong>Email:</strong> <a href={`mailto:${contactEmail(site)}`}>{contactEmail(site)}</a>
      </p>
      <p>
        We aim to reply within a few business days. If you&apos;re reporting an error in one of our data
        reports, a link to the correct/updated source helps us fix it faster.
      </p>
      <p>
        For details on how we handle any information you send us, see our{" "}
        <a href={`/s/${site.id}/privacy`}>Privacy Policy</a>.
      </p>
    </>
  );
}
