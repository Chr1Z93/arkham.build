import { createSelector } from "reselect";
import { PREVIEW_PACKS } from "@/utils/constants";
import i18n from "@/utils/i18n";
import { isEmpty } from "@/utils/is-empty";
import { time, timeEnd } from "@/utils/time";
import { ownedCardCount } from "../lib/card-ownership";
import { addProjectToMetadata, cloneMetadata } from "../lib/fan-made-content";
import { createLookupTables } from "../lib/lookup-tables";
import type { ResolvedDeck } from "../lib/types";
import type { Card } from "../services/queries.types";
import type { StoreState } from "../slices";

export const selectMetadata = createSelector(
  (state: StoreState) => state.metadata,
  (state: StoreState) => state.fanMadeData.projects,
  (state: StoreState) => state.ui.fanMadeContentCache,
  (metadata, fanMadeProjects, cache) => {
    const projects = Object.values(fanMadeProjects);

    if (isEmpty(projects) && isEmpty(cache?.cards)) return metadata;

    time("select_custom_data");

    const meta = cloneMetadata(metadata);

    for (const project of projects) {
      addProjectToMetadata(meta, project);
    }

    if (cache?.cycles) {
      for (const cycle of Object.values(cache.cycles)) {
        if (!meta.cycles[cycle.code]) {
          meta.cycles[cycle.code] = cycle;
        }
      }
    }

    if (cache?.packs) {
      for (const pack of Object.values(cache.packs)) {
        if (!meta.packs[pack.code]) {
          meta.packs[pack.code] = pack;
        }
      }
    }

    if (cache?.cards) {
      for (const card of Object.values(cache.cards)) {
        if (!meta.cards[card.code]) {
          meta.cards[card.code] = card;
        }
      }
    }

    if (cache?.encounter_sets) {
      for (const set of Object.values(cache.encounter_sets)) {
        if (!meta.encounterSets[set.code]) {
          meta.encounterSets[set.code] = set;
        }
      }
    }

    timeEnd("select_custom_data");

    return meta;
  },
);

export const selectLookupTables = createSelector(
  selectMetadata,
  (state: StoreState) => state.settings,
  (metadata, settings) => {
    return createLookupTables(metadata, settings);
  },
);

export const selectClientId = (state: StoreState) => {
  return state.app.clientId;
};

export const selectIsInitialized = (state: StoreState) => {
  return state.ui.initialized;
};

export const selectCanCheckOwnership = (state: StoreState) =>
  !state.settings.showAllCards;

export const selectCollection = createSelector(
  selectMetadata,
  (state: StoreState) => state.settings,
  (metadata, settings) => {
    const collection = {
      ...settings.collection,
      ...Object.fromEntries(
        Object.entries(metadata.packs)
          .filter(([, pack]) => pack.official === false)
          .map((pack) => [pack[0], 1]),
      ),
    };

    return settings.showPreviews
      ? {
          ...collection,
          ...PREVIEW_PACKS.reduce(
            (acc, code) => {
              acc[code] = 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
        }
      : collection;
  },
);

export const selectCardOwnedCount = createSelector(
  selectMetadata,
  selectLookupTables,
  selectCollection,
  (state: StoreState) => state.settings,
  (metadata, lookupTables, collection, settings) => {
    return (card: Card) => {
      return ownedCardCount(
        card,
        metadata,
        lookupTables,
        collection,
        settings.showAllCards,
      );
    };
  },
);

export const selectConnectionLock = createSelector(
  (state: StoreState) => state.remoting,
  (remoting) => {
    return remoting.sync || remoting.arkhamdb
      ? i18n.t("settings.connections.lock", { provider: "ArkhamDB" })
      : undefined;
  },
);

export const selectConnectionLockForDeck = createSelector(
  selectConnectionLock,
  (_: StoreState, deck: ResolvedDeck) => deck,
  (remoting, deck) => {
    return remoting && deck.source === "arkhamdb" ? remoting : undefined;
  },
);

export const selectBackCard = createSelector(
  selectMetadata,
  selectLookupTables,
  (_: StoreState, code: string) => code,
  (metadata, lookupTables, code) => {
    const card = metadata.cards[code];
    if (!card) return undefined;

    if (card.back_link_id) {
      return metadata.cards[card.back_link_id];
    }

    if (card.hidden) {
      const backCode = Object.keys(
        lookupTables.relations.fronts[code] ?? {},
      ).at(0);

      return backCode ? metadata.cards[backCode] : undefined;
    }

    return undefined;
  },
);

export const selectLocaleSortingCollator = createSelector(
  (state: StoreState) => state.settings,
  (settings) => {
    return new Intl.Collator(settings.locale, {
      ignorePunctuation: settings.sortIgnorePunctuation,
      sensitivity: "base",
      usage: "sort",
    });
  },
);
