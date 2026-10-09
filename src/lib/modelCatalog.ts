export type CatalogAsset={
 fileName:string;
 url:string;
 approximateBytes:number;
 minimumBytes:number;
};

export type CatalogModel={
 id:string;
 name:string;
 description:string;
 fileName:string;
 repo:string;
 revision:string;
 sizeLabel:string;
 approximateBytes:number;
 minimumBytes:number;
 license:string;
 url:string;
 projector?:CatalogAsset;
};

/** Curated, immutable Hugging Face revisions. Vision model and projector come from one repository. */
const qwenVisionRepo='Qwen/Qwen3-VL-2B-Instruct-GGUF';
const qwenVisionRevision='704a1fab82bbe5dcafa49bcac91a9f4831375886';
const resolve=(file:string)=>`https://huggingface.co/${qwenVisionRepo}/resolve/${qwenVisionRevision}/${file}`;

export const MODEL_CATALOG:CatalogModel[]=[
 {
  id:'qwen3-vl-2b-q4km',name:'Qwen3‑VL · 2B',description:'Understands text and images. The matching vision encoder is included in the download.',
  fileName:'Qwen3VL-2B-Instruct-Q4_K_M.gguf',repo:qwenVisionRepo,revision:qwenVisionRevision,
  sizeLabel:'about 1.6 GB total',approximateBytes:1_200_000_000,minimumBytes:1_150_000_000,
  license:'Apache 2.0',url:resolve('Qwen3VL-2B-Instruct-Q4_K_M.gguf'),
  projector:{fileName:'mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf',url:resolve('mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf'),approximateBytes:445_000_000,minimumBytes:420_000_000},
 },
];
