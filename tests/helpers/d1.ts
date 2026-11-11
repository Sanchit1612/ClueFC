import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export class TestD1{
 sqlite=new DatabaseSync(':memory:');
 constructor(){for(const file of ['0000_rooms.sql','0001_operations.sql','0002_growth_analytics.sql'])this.sqlite.exec(readFileSync(new URL('../../drizzle/'+file,import.meta.url),'utf8'))}
 prepare(sql:string){return new TestStatement(this,sql)}
 async batch(statements:TestStatement[]){this.sqlite.exec('BEGIN');try{const results=statements.map(s=>s.execute());this.sqlite.exec('COMMIT');return results}catch(error){this.sqlite.exec('ROLLBACK');throw error}}
 close(){this.sqlite.close()}
}
class TestStatement{
 args:any[]=[];
 db:TestD1;sql:string;
 constructor(db:TestD1,sql:string){this.db=db;this.sql=sql}
 bind(...args:any[]){this.args=args;return this}
 execute(){const result=this.db.sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}}}
 async run(){return this.execute()}
 async first(){return this.db.sqlite.prepare(this.sql).get(...this.args)??null}
 async all(){return {success:true,results:this.db.sqlite.prepare(this.sql).all(...this.args)}}
}
export function execution(){const pending:Promise<unknown>[]=[];return {waitUntil(promise:Promise<unknown>){pending.push(promise)},passThroughOnException(){},async drain(){await Promise.all(pending.splice(0))}}}
