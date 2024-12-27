import { Database as DB } from "sqlite3";
import { queryOnDatabase } from "./executor";
import Table, { EntryData } from "./Table";

/** Is used to restrict the results of the columns data to any item that would return `true` in this method. */
export type ColumnSearcherFunction<T> = (value: T) => boolean;

/**
 * A Column within a Table.
 * @param <T> The type of data in this column.
 * */
export default class Column<T, K extends EntryData> {
  /** The SQLite instance to utilize. */
  private db: DB;
  /** The reference to the parent table. */
  private table: Table<K>;
  /** The name of the column. */
  private name: string;

  /**
   * Constructs a Column.
   * @param sql The SQLite3 reference from the Database.
   * @param name The name of the column.
   * @param table The column's parent table.
   */
  constructor(sql: DB, name: string, table: Table<K>) {
    this.db = sql;
    this.name = name;
    this.table = table;
  }

  // Column Operations

  /**
   * Checks if the column/an entry exists.
   * @param content The entry to check, will check if the column exists if left blank.
   * @returns A promise that resolves if the item exists, or rejects if it doesnt.
   */
  public exists(entry?: T): Promise<void> {
    return new Promise((resolve, reject) => {
      // No Entry: SELECT COUNT(*) AS CNTREC FROM pragma_table_info({table}) WHERE name={column};
      // Entry: SELECT * FROM {table} WHERE {column}={entry};

      if (entry != null) {
        queryOnDatabase(
          this.db,
          `SELECT * FROM (?) WHERE (?)=(?)`,
          this.table.getName(),
          this.name,
          entry
        )
          .then((rows) => {
            if (rows.length >= 1) {
              resolve();
            } else {
              reject(new Error("Entry does not exist."));
            }
          })
          .catch(reject);
      } else {
        queryOnDatabase(
          this.db,
          "SELECT COUNT(*) AS CNTREC FROM pragma_table_info(?) WHERE name=(?);",
          this.table.getName(),
          this.name
        )
          .then((rows: [{ CNTREC: number }]) => {
            if (rows[0].CNTREC >= 1) {
              resolve();
            } else {
              reject(new Error("Column does not exist."));
            }
          })
          .catch(reject);
      }
    });
  }

  /**
   * Gets all of the entries within the column.
   * @returns All entries.
   */
  public all(): Promise<T[]> {
    return new Promise((resolve, reject) => {
      // SELECT {column} FROM {table};

      queryOnDatabase(
        this.db,
        `SELECT ${this.name} FROM ${this.table.getName()}`
      )
        .then((entries: { [key: string]: T }[]) => {
          let out: T[] = [];
          for (let entry of entries) {
            out.push(entry[this.name]);
          }
          resolve(out);
        })
        .catch(reject);
    });
  }

  /**
   * Gets all the entries in the table that the searcher method returns true with.
   * @param searcher A method which returns `true` if the value should be included in the response.
   * @returns A promise that resolves into the entries requested.
   */
  public get(searcher: ColumnSearcherFunction<T>): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.all()
        .then((entires) => {
          let out: T[] = [];

          for (let entry of entires) {
            if (searcher(entry)) out.push(entry);
          }

          resolve(out);
        })
        .catch(reject);
    });
  }

  // Column Tools

  /**
   * Gets a string representation of the column.
   * @returns A promise that resolves into a string, or rejects if an error occurs.
   */
  public toString(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.all()
        .then((entries) => {
          resolve(`Column{name=${this.name},entries=[${entries.join(",")}]}`);
        })
        .catch(reject);
    });
  }

  public fakeFunc() {}
}
