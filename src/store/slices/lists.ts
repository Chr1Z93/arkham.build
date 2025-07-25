import type { StateCreator } from "zustand";
import { assert } from "@/utils/assert";
import type { Filter } from "@/utils/fp";
import { and, not } from "@/utils/fp";
import {
  filterBacksides,
  filterDuplicates,
  filterEncounterCards,
  filterMythosCards,
  filterPreviews,
  filterType,
} from "../lib/filtering";
import type { Card } from "../services/queries.types";
import type { StoreState } from ".";
import {
  isAssetFilter,
  isCostFilter,
  isFanMadeContentFilter,
  isInvestigatorSkillsFilter,
  isLevelFilter,
  isMultiSelectFilter,
  isOwnershipFilter,
  isPropertiesFilter,
  isRangeFilter,
  isSkillIconsFilter,
  isSubtypeFilter,
} from "./lists.type-guards";
import type {
  AssetFilter,
  CostFilter,
  FanMadeContentFilter,
  FilterKey,
  FilterMapping,
  LevelFilter,
  List,
  ListsSlice,
  OwnershipFilter,
  PropertiesFilter,
  Search,
  SkillIconsFilter,
  SubtypeFilter,
} from "./lists.types";
import type { SettingsState } from "./settings.types";

function getInitialList() {
  if (window.location.href.includes("/deck/create")) {
    return "create_deck";
  }

  if (window.location.href.includes("/deck/")) {
    return "editor_player";
  }

  return "browse_player";
}

export const createListsSlice: StateCreator<StoreState, [], [], ListsSlice> = (
  set,
) => ({
  activeList: getInitialList(),
  lists: {},

  changeList(value, path) {
    set((state) => {
      const prefix = path.includes("edit") ? "editor" : "browse";
      const listKey = `${prefix}_${value}`;
      assert(state.lists[listKey], `list ${listKey} not defined.`);
      return { activeList: listKey };
    });
  },

  resetFilters() {
    set((state) => {
      const activeList = state.activeList;
      assert(activeList, "no active list is defined.");

      const list = state.lists[activeList];
      assert(list, `list ${activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [activeList]: makeList({
            ...list,
            initialValues: {
              fan_made_content: getInitialFanMadeContentFilter(state.settings),
              ownership: getInitialOwnershipFilter(state.settings),
              subtype: getInitialSubtypeFilter(state.settings),
            },
          }),
        },
      };
    });
  },

  resetFilter(id) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      const filterValues = { ...list.filterValues };
      assert(filterValues[id], `${state.activeList} has not filter ${id}.`);

      filterValues[id] = makeFilterValue(filterValues[id].type, list.cardType);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filterValues,
          },
        },
      };
    });
  },

  setActiveList(value) {
    if (value == null) {
      set({ activeList: undefined });
    } else {
      set((state) => {
        assert(state.lists[value], `list ${value} not defined.`);
        return { activeList: value };
      });
    }
  },

  setFilterOpen(id, open) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      const filterValues = { ...list.filterValues };
      assert(filterValues[id], `${state.activeList} has not filter ${id}.`);

      filterValues[id] = { ...filterValues[id], open };

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filterValues,
          },
        },
      };
    });
  },

  setFilterValue(id, payload) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      const filterValues = { ...list.filterValues };
      assert(filterValues[id], `${state.activeList} has not filter ${id}.`);

      switch (filterValues[id].type) {
        case "illustrator":
        case "action":
        case "encounter_set":
        case "trait":
        case "type":
        case "pack":
        case "faction": {
          assert(
            isMultiSelectFilter(payload),
            `filter ${id} value must be an array.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "cost": {
          const currentValue = filterValues[id].value as CostFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isCostFilter(value),
            `filter ${id} value must be a cost object.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "fan_made_content": {
          assert(
            isFanMadeContentFilter(payload),
            `filter ${id} value must be a string.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "level": {
          const currentValue = filterValues[id].value as LevelFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isLevelFilter(value),
            `filter ${id} value must be an level object.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "ownership": {
          assert(
            isOwnershipFilter(payload),
            `filter ${id} value must be a string.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "investigator": {
          assert(
            typeof payload === "string",
            `filter ${id} value must be a string.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "tabooSet": {
          filterValues[id] = {
            ...filterValues[id],
            value: payload as number | undefined,
          };
          break;
        }

        case "subtype": {
          const currentValue = filterValues[id].value as SubtypeFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isSubtypeFilter(value),
            `filter ${id} value must be a map of booleans.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "properties": {
          const currentValue = filterValues[id].value as PropertiesFilter;
          const value = { ...currentValue, ...payload };

          assert(
            isPropertiesFilter(value),
            `filter ${id} value must be a map of booleans.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "asset": {
          const currentValue = filterValues[id].value as AssetFilter;
          const value = { ...currentValue, ...payload };
          assert(
            isAssetFilter(value),
            `filter ${id} value must be an asset object.`,
          );

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "health":
        case "sanity": {
          assert(
            isRangeFilter(payload),
            `filter ${id} value must be an array of two numbers.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "skillIcons": {
          assert(
            isSkillIconsFilter(payload),
            `filter ${id} value must be an object.`,
          );
          const currentValue = filterValues[id].value as SkillIconsFilter;
          const value = { ...currentValue, ...payload };

          filterValues[id] = { ...filterValues[id], value };
          break;
        }

        case "investigator_skills": {
          assert(
            isInvestigatorSkillsFilter(payload),
            `filter ${id} value must be an object.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }

        case "investigator_card_access": {
          assert(
            isMultiSelectFilter(payload),
            `filter ${id} value must be an array.`,
          );
          filterValues[id] = { ...filterValues[id], value: payload };
          break;
        }
      }

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filterValues,
          },
        },
      };
    });
  },

  setSearchFlag(flag, value) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            search: {
              ...list.search,
              [flag]: value,
            },
          },
        },
      };
    });
  },

  setSearchValue(value) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            search: {
              ...list.search,
              value,
            },
          },
        },
      };
    });
  },

  setFiltersEnabled(value) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            filtersEnabled: value,
          },
        },
      };
    });
  },

  setListViewMode(viewMode) {
    set((state) => {
      assert(state.activeList, "no active list is defined.");

      const list = state.lists[state.activeList];
      assert(list, `list ${state.activeList} not defined.`);

      return {
        lists: {
          ...state.lists,
          [state.activeList]: {
            ...list,
            display: {
              ...list.display,
              viewMode,
            },
          },
        },
      };
    });
  },

  addList(key, cardType, initialValues) {
    set((state) => {
      const lists = { ...state.lists };
      assert(!lists[key], `list ${key} already exists.`);

      assert(cardType === "player", "only player lists are supported for now.");

      lists[key] = makePlayerCardsList(key, state.settings, {
        showInvestigators: true,
        additionalFilters: ["illustrator"],
        initialValues: {
          ...initialValues,
          fan_made_content: getInitialFanMadeContentFilter(state.settings),
          ownership: getInitialOwnershipFilter(state.settings),
          subtype: getInitialSubtypeFilter(state.settings),
        },
      });

      return { lists };
    });
  },

  removeList(key) {
    set((state) => {
      const lists = { ...state.lists };
      delete lists[key];
      return { lists };
    });
  },
});

function makeSearch(): Search {
  return {
    value: "",
    includeBacks: false,
    includeFlavor: false,
    includeGameText: false,
    includeName: true,
  };
}

function makeFilterObject<K extends FilterKey>(
  type: K,
  value: FilterMapping[K],
  open = false,
) {
  return {
    open,
    type,
    value,
  };
}

function makeFilterValue(
  type: FilterKey,
  cardType: List["cardType"],
  initialValue?: unknown,
) {
  switch (type) {
    case "asset": {
      return makeFilterObject(
        type,
        isAssetFilter(initialValue)
          ? initialValue
          : {
              health: undefined,
              sanity: undefined,
              skillBoosts: [],
              slots: [],
              uses: [],
              healthX: false,
            },
      );
    }

    case "cost": {
      return makeFilterObject(
        type,
        isCostFilter(initialValue)
          ? initialValue
          : {
              range: undefined,
              even: false,
              odd: false,
              x: false,
            },
      );
    }

    case "level": {
      return makeFilterObject(
        type,
        isLevelFilter(initialValue)
          ? initialValue
          : {
              range: undefined,
              exceptional: false,
              nonexceptional: false,
            },
      );
    }

    case "health":
    case "sanity": {
      return makeFilterObject(
        type,
        isRangeFilter(initialValue) ? initialValue : undefined,
      );
    }

    case "investigator_skills": {
      return makeFilterObject(
        type,
        isInvestigatorSkillsFilter(initialValue)
          ? initialValue
          : {
              agility: undefined,
              combat: undefined,
              intellect: undefined,
              willpower: undefined,
            },
      );
    }

    case "illustrator":
    case "investigator_card_access":
    case "action":
    case "encounter_set":
    case "pack":
    case "trait":
    case "type":
    case "faction": {
      return makeFilterObject(
        type,
        isMultiSelectFilter(initialValue) ? initialValue : [],
      );
    }

    case "subtype": {
      return makeFilterObject(
        type,
        isSubtypeFilter(initialValue) && cardType === "player"
          ? initialValue
          : {
              none: true,
              weakness: true,
              basicweakness: true,
            },
        cardType === "player" ? !initialValue : false,
      );
    }

    case "ownership": {
      return makeFilterObject(
        type,
        isOwnershipFilter(initialValue) ? initialValue : "all",
      );
    }

    case "fan_made_content": {
      return makeFilterObject(
        type,
        isFanMadeContentFilter(initialValue) ? initialValue : "all",
      );
    }

    case "properties": {
      return makeFilterObject(
        type,
        isPropertiesFilter(initialValue)
          ? initialValue
          : {
              bonded: false,
              customizable: false,
              exile: false,
              fast: false,
              healsDamage: false,
              healsHorror: false,
              multiClass: false,
              permanent: false,
              seal: false,
              specialist: false,
              succeedBy: false,
              unique: false,
              victory: false,
            },
        true,
      );
    }

    case "investigator": {
      return makeFilterObject(
        type,
        typeof initialValue === "string" ? initialValue : undefined,
      );
    }

    case "tabooSet": {
      return makeFilterObject(
        type,
        typeof initialValue === "number" ? initialValue : undefined,
      );
    }

    case "skillIcons": {
      return makeFilterObject(
        "skillIcons",
        isSkillIconsFilter(initialValue)
          ? initialValue
          : {
              agility: undefined,
              combat: undefined,
              intellect: undefined,
              willpower: undefined,
              wild: undefined,
              any: undefined,
            },
      );
    }
  }
}

type MakeListOptions = {
  key: string;
  cardType: List["cardType"];
  filters: FilterKey[];
  display: List["display"];
  duplicateFilter: Filter;
  systemFilter?: Filter;
  initialValues?: Partial<Record<FilterKey, unknown>>;
  search?: Search;
};

function makeList({
  key,
  cardType,
  filters,
  display,
  duplicateFilter,
  systemFilter,
  initialValues,
  search,
}: MakeListOptions): List {
  return {
    cardType,
    duplicateFilter,
    filters,
    filterValues: filters.reduce<List["filterValues"]>((acc, curr, i) => {
      acc[i] = makeFilterValue(curr, cardType, initialValues?.[curr]);
      return acc;
    }, {}),
    filtersEnabled: true,
    display,
    key,
    systemFilter,
    search: search ?? makeSearch(),
  };
}

function makePlayerCardsList(
  key: string,
  settings: SettingsState,
  {
    properties = [] as string[],
    initialValues = {} as Partial<Record<FilterKey, unknown>>,
    showInvestigators = false,
    additionalFilters = [] as FilterKey[],
  } = {},
): List {
  const filters: FilterKey[] = ["faction", "type", "level"];

  if (!settings.showAllCards) {
    filters.push("ownership");
  }

  filters.push("fan_made_content");

  if (showInvestigators) {
    filters.push("investigator");
  }

  filters.push(
    "subtype",
    "cost",
    "trait",
    "asset",
    "skillIcons",
    "properties",
    "action",
    "pack",
    "tabooSet",
    ...additionalFilters,
  );

  const systemFilter = [
    not(filterEncounterCards),
    filterMythosCards,
    filterBacksides,
  ];

  if (!settings.showPreviews) {
    systemFilter.push(not(filterPreviews));
  }

  return makeList({
    key,
    cardType: "player",
    filters,
    display: {
      grouping: settings.lists.player.group,
      properties,
      sorting: settings.lists.player.sort,
      viewMode: settings.lists.player.viewMode,
    },
    duplicateFilter: (c: Card) => filterDuplicates(c) || !!c.parallel,
    systemFilter: and(systemFilter),
    initialValues: mergeInitialValues(initialValues, settings),
  });
}

function makeInvestigatorCardsList(
  key: string,
  settings: SettingsState,
  { initialValues = {} as Partial<Record<FilterKey, unknown>> } = {},
): List {
  const filters: FilterKey[] = [
    "faction",
    "investigator_skills",
    "fan_made_content",
    "investigator_card_access",
    "trait",
    "health",
    "sanity",
  ];

  if (!settings.showAllCards) {
    filters.splice(2, 0, "ownership");
  }

  return makeList({
    key,
    cardType: "player",
    filters,
    display: {
      grouping: settings.lists.investigator.group,
      sorting: settings.lists.investigator.sort,
      viewMode: settings.lists.investigator.viewMode,
    },
    duplicateFilter: (c: Card) => filterDuplicates(c) || !!c.parallel,
    systemFilter: and([
      filterType(["investigator"]),
      not(filterEncounterCards),
    ]),
    initialValues: mergeInitialValues(initialValues, settings),
  });
}

function makeEncounterCardsList(
  key: string,
  settings: SettingsState,
  {
    properties = [] as string[],
    initialValues = {} as Partial<Record<FilterKey, unknown>>,
    additionalFilters = [] as FilterKey[],
  } = {},
): List {
  const filters: FilterKey[] = ["faction", "type"];

  if (!settings.showAllCards) {
    filters.push("ownership");
  }

  filters.push(
    "fan_made_content",
    "cost",
    "trait",
    "subtype",
    "asset",
    "skillIcons",
    "properties",
    "action",
    "pack",
    "encounter_set",
    ...additionalFilters,
  );

  const systemFilter = [filterEncounterCards, filterBacksides];

  return makeList({
    key,
    cardType: "encounter",
    filters,
    display: {
      grouping: settings.lists.encounter.group,
      sorting: settings.lists.encounter.sort,
      properties,
      viewMode: settings.lists.encounter.viewMode,
    },
    duplicateFilter: filterDuplicates,
    systemFilter: and(systemFilter),
    initialValues: mergeInitialValues(initialValues, settings),
  });
}

const SHARED_PLAYER_PROPERTIES = [
  "customizable",
  "exile",
  "fast",
  "healsDamage",
  "healsHorror",
  "multiClass",
  "permanent",
  "seal",
  "specialist",
  "succeedBy",
  "unique",
];

const SHARED_ENCOUNTER_PROPERTIES = ["fast", "permanent", "unique"];

export function makeLists(
  settings: SettingsState,
  initialValues?: Partial<Record<FilterKey, unknown>>,
) {
  return {
    browse_player: makePlayerCardsList("browse_player", settings, {
      showInvestigators: true,
      additionalFilters: ["illustrator"],
      initialValues,
      properties: [...SHARED_PLAYER_PROPERTIES, "bonded"],
    }),
    browse_encounter: makeEncounterCardsList("browse_encounter", settings, {
      additionalFilters: ["illustrator"],
      initialValues,
      properties: [...SHARED_ENCOUNTER_PROPERTIES, "victory"],
    }),
    create_deck: makeInvestigatorCardsList("create_deck", settings, {
      initialValues,
    }),
    editor_player: makePlayerCardsList("editor_player", settings, {
      initialValues,
      properties: SHARED_PLAYER_PROPERTIES,
    }),
    editor_encounter: makeEncounterCardsList("editor_encounter", settings, {
      initialValues,
      properties: [...SHARED_ENCOUNTER_PROPERTIES, "seal", "succeedBy"],
    }),
  };
}

function mergeInitialValues(
  initialValues: Partial<Record<FilterKey, unknown>>,
  settings: SettingsState,
) {
  return {
    ...initialValues,
    fan_made_content: getInitialFanMadeContentFilter(settings),
    ownership: getInitialOwnershipFilter(settings),
    subtype: getInitialSubtypeFilter(settings),
  };
}

function getInitialFanMadeContentFilter(
  settings: SettingsState,
): FanMadeContentFilter {
  return settings.cardListsDefaultContentType ?? "all";
}

function getInitialOwnershipFilter(settings: SettingsState): OwnershipFilter {
  return settings.showAllCards ? "all" : "owned";
}

function getInitialSubtypeFilter(
  settings: SettingsState,
): SubtypeFilter | undefined {
  return settings.hideWeaknessesByDefault
    ? {
        none: true,
        weakness: false,
        basicweakness: false,
      }
    : undefined;
}
