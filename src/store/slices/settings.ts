import type { StateCreator } from "zustand";
import { changeLanguage } from "@/utils/i18n";
import { dehydrate } from "../persist";
import {
  queryCards,
  queryDataVersion,
  queryMetadata,
} from "../services/queries";
import type { StoreState } from ".";
import { makeLists } from "./lists";
import type {
  DecklistConfig,
  ListConfig,
  SettingsSlice,
  SettingsState,
} from "./settings.types";

export const PLAYER_DEFAULTS: ListConfig = {
  group: ["subtype", "type", "slot"],
  sort: ["name", "level", "position"],
  viewMode: "compact",
};

export const ENCOUNTER_DEFAULTS: ListConfig = {
  group: ["pack", "encounter_set"],
  sort: ["position"],
  viewMode: "compact",
};

export const INVESTIGATOR_DEFAULTS: ListConfig = {
  group: ["cycle"],
  sort: ["position"],
  viewMode: "compact",
};

export const DECK_DEFAULTS: DecklistConfig = {
  group: ["type", "slot"],
  sort: ["name", "level"],
};

export const DECK_SCANS_DEFAULTS: DecklistConfig = {
  group: ["type"],
  sort: ["slot", "name", "level", "position"],
};

export function getInitialListsSetting(): SettingsState["lists"] {
  return {
    player: structuredClone(PLAYER_DEFAULTS),
    encounter: structuredClone(ENCOUNTER_DEFAULTS),
    investigator: structuredClone(INVESTIGATOR_DEFAULTS),
    deck: structuredClone(DECK_DEFAULTS),
    deckScans: structuredClone(DECK_SCANS_DEFAULTS),
  };
}

export function getInitialSettings(): SettingsState {
  return {
    cardLevelDisplay: "icon-only",
    cardListsDefaultContentType: "all",
    cardSkillIconsDisplay: "simple",
    defaultStorageProvider: "local",
    collection: {},
    flags: {},
    fontSize: 100,
    hideWeaknessesByDefault: false,
    lists: getInitialListsSetting(),
    locale: "en",
    notesEditor: {
      defaultFormat: "paragraph",
      defaultOrigin: "player",
    },
    showAllCards: true,
    showMoveToSideDeck: false,
    showPreviews: false,
    sortIgnorePunctuation: false,
    tabooSetId: undefined,
    useLimitedPoolForWeaknessDraw: true,
  };
}

export const createSettingsSlice: StateCreator<
  StoreState,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  settings: getInitialSettings(),
  // TODO: extract to `shared` since this touches other state slices.
  async applySettings(settings) {
    const state = get();

    // This has to happen first, since the constructed metadata in `init` depends on the locale in some places.
    // TODO: revisit where this dependency is coming from.
    await changeLanguage(settings.locale);

    if (settings.locale !== state.settings.locale) {
      await state.init(
        queryMetadata,
        queryDataVersion,
        queryCards,
        true,
        settings.locale,
        {
          lists: makeLists(settings),
          settings: {
            ...state.settings,
            ...settings,
          },
        },
      );
    } else {
      set({
        settings,
        lists: makeLists(settings),
      });

      await dehydrate(get(), "app");
    }
  },
  async setSettings(payload) {
    set((state) => ({
      settings: {
        ...state.settings,
        ...payload,
      },
    }));

    await dehydrate(get(), "app");
  },
  async toggleFlag(key) {
    set((state) => ({
      settings: {
        ...state.settings,
        flags: {
          ...state.settings.flags,
          [key]: !state.settings.flags?.[key],
        },
      },
    }));

    await dehydrate(get(), "app");
  },
});
