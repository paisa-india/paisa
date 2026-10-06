import type {MetadataRoute} from 'next';
import {absolute} from '../lib/site';
export const dynamic='force-static';
/** Everything is public. (On a github.io project site crawlers read robots.txt only at the domain root; this takes effect on a custom domain.) */
export default function robots():MetadataRoute.Robots{return {rules:[{userAgent:'*',allow:'/'}],sitemap:absolute('/sitemap.xml')};}
