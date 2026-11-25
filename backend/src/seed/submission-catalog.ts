import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Connection, mongo } from 'mongoose';

const collections = ['brands', 'categories', 'products'] as const;
type SubmissionCatalog = Record<(typeof collections)[number], mongo.Document[]>;

async function requireEmptyCatalog(
  db: mongo.Db,
  session?: mongo.ClientSession,
): Promise<void> {
  for (const name of collections) {
    const existing = await db.collection(name).findOne(
      {},
      { projection: { _id: 1 }, session },
    );
    if (existing) {
      throw new Error(
        'Danh mục đã có dữ liệu. Hãy dùng một database mới cho lệnh seed:catalog.',
      );
    }
  }
}

export async function prepareSubmissionCatalog(
  connection: Connection,
): Promise<SubmissionCatalog> {
  const db = connection.db;
  if (!db) throw new Error('MongoDB chưa kết nối.');
  await requireEmptyCatalog(db);

  const file = join(__dirname, '../../seed-data/catalog.json');
  const content = await readFile(file, 'utf8');
  const snapshot = mongo.BSON.EJSON.parse(content) as
    | (Partial<SubmissionCatalog> & { version?: number })
    | null;
  if (
    snapshot?.version !== 1 ||
    collections.some((name) => !Array.isArray(snapshot[name]) || !snapshot[name]?.length)
  ) {
    throw new Error('Tệp danh mục nộp không đúng định dạng.');
  }
  return snapshot as SubmissionCatalog;
}

export async function importSubmissionCatalog(
  connection: Connection,
  snapshot: SubmissionCatalog,
): Promise<void> {
  const db = connection.db;
  if (!db) throw new Error('MongoDB chưa kết nối.');

  await connection.transaction(async (session) => {
    await requireEmptyCatalog(db, session);
    for (const name of collections) {
      await db.collection(name).insertMany(snapshot[name], { session });
    }
  });

  console.log(
    `Đã nạp ${snapshot.products.length} sản phẩm, ${snapshot.categories.length} danh mục, ${snapshot.brands.length} thương hiệu.`,
  );
}
