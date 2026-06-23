import type { ComponentType } from "react";
import type { SiteHomeProps, SiteArticleProps } from "@/lib/types";

import VisaHome from "./visaexpert/Home";
import VisaArticle from "./visaexpert/Article";
import AiHome from "./ainews/Home";
import AiArticle from "./ainews/Article";
import BdHome from "./bangladeshexpert/Home";
import BdArticle from "./bangladeshexpert/Article";
import QatarHome from "./qatarexperts/Home";
import QatarArticle from "./qatarexperts/Article";
import InfKeyHome from "./infkey/Home";
import InfKeyArticle from "./infkey/Article";
import CountlyHome from "./countly/Home";
import CountlyArticle from "./countly/Article";
import WalviHome from "./walvi/Home";
import WalviArticle from "./walvi/Article";

export interface SiteComponents {
  Home: ComponentType<SiteHomeProps>;
  Article: ComponentType<SiteArticleProps>;
}

export const SITE_COMPONENTS: Record<string, SiteComponents> = {
  visaexpert: { Home: VisaHome, Article: VisaArticle },
  ainews: { Home: AiHome, Article: AiArticle },
  bangladeshexpert: { Home: BdHome, Article: BdArticle },
  qatarexperts: { Home: QatarHome, Article: QatarArticle },
  infkey: { Home: InfKeyHome, Article: InfKeyArticle },
  countly: { Home: CountlyHome, Article: CountlyArticle },
  walvi: { Home: WalviHome, Article: WalviArticle },
};
