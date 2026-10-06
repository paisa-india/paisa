'use client';
import {useEffect, useState} from 'react';
import Script from 'next/script';
import {analyticsConfig, trackingAllowed, trackPageView} from '../lib/analytics';

/** Opt-in, production-only analytics. There is no automatic click/form collection. */
export default function Analytics({page}: {page: string}) {
 const [enabled, setEnabled] = useState(false);
 useEffect(() => {setEnabled(trackingAllowed()); trackPageView();}, [page]);
 if (!enabled) return null;
 return <Script id="paisa-analytics" src={analyticsConfig.scriptUrl} strategy="afterInteractive"
  data-website-id={analyticsConfig.websiteId} data-auto-track="false"
  data-exclude-search="true" data-exclude-hash="true" data-do-not-track="true"
  data-domains={analyticsConfig.hostname} referrerPolicy="no-referrer" onReady={trackPageView}/>;
}
