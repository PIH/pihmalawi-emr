import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, TabList, Tabs } from '@carbon/react';
import { ChevronDown, ChevronUp } from '@carbon/react/icons';
import { ConfigurableLink, MaybeIcon, navigate } from '@openmrs/esm-framework';
import styles from './card-group.scss';
import { type EMastercardCard } from '../emastercards.resource';

/** The search parameter that picks which of a group's cards a chart page shows */
export const CARD_PARAM = 'card';

/** Short names for the cards a page's tabs and the left navigation list; others use their label */
const CARD_NAMES: Record<string, string> = {
  'mental-health': 'Mental Health',
  epilepsy: 'Epilepsy',
  'htn-dm': 'Hypertension and Diabetes',
  art: 'ART',
  'teen-club': 'Teen Club',
  'pre-art': 'Pre-ART',
  'exposed-child': 'Exposed Child',
};

export const cardName = (card: EMastercardCard) => CARD_NAMES[card.key] ?? card.label.replace(/ eMastercard$/i, '');

/** The page's URL, kept up to date as the chart navigates */
export function useCurrentUrl(): URL {
  const [href, setHref] = useState(window.location.href);
  useEffect(() => {
    const update = () => setHref(window.location.href);
    window.addEventListener('popstate', update);
    window.addEventListener('single-spa:routing-event', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('single-spa:routing-event', update);
    };
  }, []);
  return new URL(href);
}

/** The card a group's page shows: the one the URL names, else the page's own card, else the first */
export function selectedCard(cards: Array<EMastercardCard>, requested: string | null, defaultKey: string) {
  return cards.find((c) => c.key === requested) ?? cards.find((c) => c.key === defaultKey) ?? cards[0] ?? null;
}

const cardUrl = (basePath: string, path: string, key: string) => `${basePath}/${path}?${CARD_PARAM}=${encodeURIComponent(key)}`;

/**
 * A group's entry in the chart's left navigation when the patient has more than one of its cards: the group,
 * expanded, with a link to each card's page
 */
export const CardGroupNav: React.FC<{
  basePath: string;
  path: string;
  title: string;
  icon?: string;
  cards: Array<EMastercardCard>;
  defaultKey: string;
}> = ({ basePath, path, title, icon, cards, defaultKey }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const url = useCurrentUrl();
  const onPage = url.pathname.split('/').includes(path);
  const current = onPage ? selectedCard(cards, url.searchParams.get(CARD_PARAM), defaultKey) : null;
  return (
    <div>
      <button type="button" className={`cds--side-nav__link ${styles.group}`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <span className={styles.menu}>
          <MaybeIcon icon={icon} className={styles.icon} size={16} />
          <span className={styles.title}>{t(title)}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {expanded &&
        cards.map((c) => (
          <ConfigurableLink
            key={c.key}
            className={`cds--side-nav__link ${styles.item} ${current?.key === c.key ? 'active-left-nav-link' : ''}`}
            to={cardUrl(basePath, path, c.key)}
          >
            {t(`cardName_${c.key}`, cardName(c))}
          </ConfigurableLink>
        ))}
    </div>
  );
};

/** Tabs for a group's cards on its chart page, as in the mockup; each tab opens that card's page */
export const CardGroupTabs: React.FC<{ patientUuid: string; path: string; cards: Array<EMastercardCard>; selected: string; label: string }> = ({
  patientUuid,
  path,
  cards,
  selected,
  label,
}) => {
  const { t } = useTranslation();
  if (cards.length < 2) {
    return null;
  }
  return (
    <Tabs
      selectedIndex={Math.max(0, cards.findIndex((c) => c.key === selected))}
      onChange={({ selectedIndex }: { selectedIndex: number }) =>
        navigate({ to: cardUrl(`\${openmrsSpaBase}/patient/${patientUuid}/chart`, path, cards[selectedIndex].key) })
      }
    >
      <TabList aria-label={label} contained={false}>
        {cards.map((c) => (
          <Tab key={c.key}>{t(`cardName_${c.key}`, cardName(c))}</Tab>
        ))}
      </TabList>
    </Tabs>
  );
};
