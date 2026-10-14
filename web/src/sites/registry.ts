import type { ComponentType } from "react";
import type { SiteHomeProps, SiteArticleProps } from "@/lib/types";

export interface SiteComponents {
  Home: ComponentType<SiteHomeProps>;
  Article: ComponentType<SiteArticleProps>;
}

// Build-time site selection (next.config inlines SITE_ID). Only the deployed site's components, and therefore only
// its CSS, end up in the bundle: importing all nine designs shipped 12 render-blocking stylesheets (~100 KB) to
// every site (mobile Lighthouse). Without SITE_ID (local multi-site dev) every design is loaded.
/* eslint-disable @typescript-eslint/no-require-imports */
// Each test must use process.env.SITE_ID literally: webpack only drops a dead branch (and its CSS) when the
// condition is a constant at parse time, and a variable holding the value is not.

function load(): Record<string, SiteComponents> {
  if (process.env.SITE_ID === "visaexpert") return {
    visaexpert: {
      Home: require("./visaexpert/Home").default,
      Article: require("./visaexpert/Article").default,
    },
  };
  if (process.env.SITE_ID === "ainews") return {
    ainews: {
      Home: require("./ainews/Home").default,
      Article: require("./ainews/Article").default,
    },
  };
  if (process.env.SITE_ID === "bangladeshexpert") return {
    bangladeshexpert: {
      Home: require("./bangladeshexpert/Home").default,
      Article: require("./bangladeshexpert/Article").default,
    },
  };
  if (process.env.SITE_ID === "qatarexperts") return {
    qatarexperts: {
      Home: require("./qatarexperts/Home").default,
      Article: require("./qatarexperts/Article").default,
    },
  };
  if (process.env.SITE_ID === "infkey") return {
    infkey: {
      Home: require("./infkey/Home").default,
      Article: require("./infkey/Article").default,
    },
  };
  if (process.env.SITE_ID === "countly") return {
    countly: {
      Home: require("./countly/Home").default,
      Article: require("./countly/Article").default,
    },
  };
  if (process.env.SITE_ID === "walvi") return {
    walvi: {
      Home: require("./walvi/Home").default,
      Article: require("./walvi/Article").default,
    },
  };
  if (process.env.SITE_ID === "ninetymins") return {
    ninetymins: {
      Home: require("./ninetymins/Home").default,
      Article: require("./ninetymins/Article").default,
    },
  };
  if (process.env.SITE_ID === "gccguide") return {
    gccguide: {
      Home: require("./gccguide/Home").default,
      Article: require("./gccguide/Article").default,
    },
  };
  // Local multi-site dev only: guarded by a constant test too, so a site build never pulls in the other designs.
  if (!process.env.SITE_ID) {
    return {
      visaexpert: {
        Home: require("./visaexpert/Home").default,
        Article: require("./visaexpert/Article").default,
      },
      ainews: {
        Home: require("./ainews/Home").default,
        Article: require("./ainews/Article").default,
      },
      bangladeshexpert: {
        Home: require("./bangladeshexpert/Home").default,
        Article: require("./bangladeshexpert/Article").default,
      },
      qatarexperts: {
        Home: require("./qatarexperts/Home").default,
        Article: require("./qatarexperts/Article").default,
      },
      infkey: {
        Home: require("./infkey/Home").default,
        Article: require("./infkey/Article").default,
      },
      countly: {
        Home: require("./countly/Home").default,
        Article: require("./countly/Article").default,
      },
      walvi: {
        Home: require("./walvi/Home").default,
        Article: require("./walvi/Article").default,
      },
      ninetymins: {
        Home: require("./ninetymins/Home").default,
        Article: require("./ninetymins/Article").default,
      },
      gccguide: {
        Home: require("./gccguide/Home").default,
        Article: require("./gccguide/Article").default,
      },
    };
  }
  return {};
}

export const SITE_COMPONENTS: Record<string, SiteComponents> = load();
