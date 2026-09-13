import {describe,it,expect} from 'vitest';
import {searchFiscalRecords} from './FiscalRecordPicker';
import codes from '@/lib/saas/nationalServiceCodes.json';
describe('busca de cadastros e classificações',()=>{
 const rows=[{id:'1',name:'Móveis São João',code:'00123',identifier:'04.252.011/0001-10',location:'Maceió / AL'},{id:'2',name:'Programação',code:'010201'}];
 it('encontra código com zeros, nome sem acento e documento sem pontuação',()=>{
  expect(searchFiscalRecords(rows,'00123')[0].id).toBe('1');
  expect(searchFiscalRecords(rows,'moveis sao')[0].id).toBe('1');
  expect(searchFiscalRecords(rows,'04252011000110')[0].id).toBe('1');
  expect(searchFiscalRecords(rows,'maceio')[0].id).toBe('1');
 });
 it('não transforma apenas pontuação em todos os resultados',()=>expect(searchFiscalRecords(rows,'???')).toEqual([]));
 it('mantém os 338 códigos oficiais únicos de seis dígitos',()=>{
  expect(codes).toHaveLength(338);expect(new Set(codes.map(r=>r.code)).size).toBe(338);
  expect(codes.every(r=>/^\d{6}$/.test(r.code)&&r.description)).toBe(true);
  expect(codes.find(r=>r.code==='010201')?.description).toBe('Programação.');
 });
});
