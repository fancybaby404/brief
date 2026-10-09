export type CatalogAsset={
 fileName:string;
 url:string;
 /** Exact size at the pinned revision; a download of any other size is rejected. */
 bytes:number;
};

export type CatalogModel={
 id:string;
 name:string;
 description:string;
 fileName:string;
 repo:string;
 revision:string;
 sizeLabel:string;
 bytes:number;
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
  sizeLabel:'about 1.6 GB total',bytes:1_107_409_952,
  license:'Apache 2.0',url:resolve('Qwen3VL-2B-Instruct-Q4_K_M.gguf'),
  projector:{fileName:'mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf',url:resolve('mmproj-Qwen3VL-2B-Instruct-Q8_0.gguf'),bytes:445_053_216},
 },
];
