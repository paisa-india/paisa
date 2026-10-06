import type {MoneyRecord,Source} from '../packages/schema/index';
export type SourceArtifact={id:string;url:string;datasetVersion:string};
export interface PaisaConnector {
 id:string;authority:string;
 discover():Promise<SourceArtifact[]>;
 fetch(artifact:SourceArtifact):Promise<{source:Source;raw:Uint8Array}|null>;
 parse(snapshot:{source:Source;raw:Uint8Array}):Promise<MoneyRecord[]>;
 validate(records:MoneyRecord[]):Promise<{passed:boolean;reason?:string}>;
 getLicense():Source['license'];
}
