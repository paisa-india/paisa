import type {Metadata} from 'next';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import './globals.css';
import './atlas.css';
const basePath=process.env.NEXT_PUBLIC_BASE_PATH??'';
const siteUrl=new URL((process.env.NEXT_PUBLIC_SITE_URL||'https://paisa-india.github.io/paisa').replace(/\/$/,'')+'/');
const title='PAISA — Follow public money';
const description='An independent, open-source view of India’s public money. Explore official budgets, understand your tax, and verify every number.';
const socialImage=new URL('brand/social-card.png',siteUrl).toString();
export const metadata:Metadata={
 title,description,applicationName:'PAISA',metadataBase:siteUrl,
 icons:{icon:[{url:`${basePath}/brand/symbol.svg`,type:'image/svg+xml'},{url:`${basePath}/brand/favicon-32.png`,type:'image/png',sizes:'32x32'}],apple:[{url:`${basePath}/brand/apple-touch-icon.png`,sizes:'180x180'}]},
 openGraph:{type:'website',siteName:'PAISA',locale:'en_IN',title,description,images:[{url:socialImage,width:1200,height:630,alt:'PAISA. Public money. Public knowledge. Follow India’s public money. Understand it. Verify it.'}]},
 twitter:{card:'summary_large_image',title,description,images:[socialImage]},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
