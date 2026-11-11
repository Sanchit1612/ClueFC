export const SOURCES=['direct','reddit','r-webgames','r-playmygame','r-football','football-community','discord','whatsapp','instagram','x','google','bing','referral','other'] as const;
export const MEDIUMS=['direct','community','organic-social','referral','organic-search','other'] as const;
export const CAMPAIGNS=['beta-launch','football-challenge','friends-invite','organic','unspecified'] as const;
export const CONTENTS=['launch-post','clue-post','weekly-thread','mod-approved','bio','invite','share-scorecard','unspecified'] as const;
export const CLIENT_EVENTS=['session_started','landing_view','practice_started','invite_shared','scorecard_downloaded'] as const;
export type GrowthContext={session:string;visitor:string;source:typeof SOURCES[number];medium:typeof MEDIUMS[number];campaign:typeof CAMPAIGNS[number];content:typeof CONTENTS[number];device:'mobile'|'desktop'};
