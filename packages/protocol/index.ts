import {z} from 'zod';
export const codeSchema=z.string().regex(/^[A-HJ-KM-NP-Z2-9]{3}-[2-9]{2}$/);
export const nameSchema=z.string().trim().min(2).max(16);
const team=z.enum(['home','away']);
const schemas={
 'team.join':z.object({team}), 'role.claim':z.object({}),
 'settings.update':z.object({timer:z.union([z.literal(0),z.literal(60),z.literal(90),z.literal(120)]),yellows:z.boolean(),protectLast:z.boolean(),pack:z.enum(['classic','terrace','tactics']).optional()}),
 'match.start':z.object({}), 'clue.submit':z.object({word:z.string().max(30),number:z.union([z.number().int().min(0).max(9),z.literal('unlimited')])}),
 'tile.reveal':z.object({index:z.number().int().min(0).max(24)}), 'turn.end':z.object({}), 'match.rematch':z.object({}), 'lobby.return':z.object({}),
 'player.ready':z.object({}), 'room.leave':z.object({}), 'ping':z.object({}),
 'reaction':z.object({text:z.enum(['Nice one','Unlucky','GG','What a clue','Come on!'])}),
 'vote.kick':z.object({targetId:z.string().uuid()}), 'report.player':z.object({targetId:z.string().uuid(),reason:z.enum(['Offensive name','Offensive clue','Griefing','Other'])}),
 'role.replace':z.object({targetId:z.string().uuid()})
};
export const envelope=z.object({type:z.enum(Object.keys(schemas) as [keyof typeof schemas,...(keyof typeof schemas)[]]),seq:z.number().int().positive(),payload:z.unknown()});
export function parseMessage(body:unknown){const e=envelope.parse(body);return {...e,payload:schemas[e.type].parse(e.payload) as any}}
