/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Used for caching variable inference results to improve performance
 */

interface CacheNode<V> {
  key: string;
  value: V;
  prev: CacheNode<V> | null;
  next: CacheNode<V> | null;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
}

export class LRUCache<V> {
  private maxSize: number;
  private cache = new Map<string, CacheNode<V>>();
  private head: CacheNode<V> | null = null;
  private tail: CacheNode<V> | null = null;
  private _hits = 0;
  private _misses = 0;

  constructor(maxSize: number = 100) {
    if (maxSize <= 0) {
      throw new Error('Max size must be greater than 0');
    }
    this.maxSize = maxSize;
  }

  /**
   * Get value from cache
   */
  get(key: string): V | undefined {
    const node = this.cache.get(key);

    if (!node) {
      this._misses++;
      return undefined;
    }


    this.moveToFront(node);
    this._hits++;

    return node.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: V): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {

      existingNode.value = value;
      this.moveToFront(existingNode);
      return;
    }


    const newNode: CacheNode<V> = {
      key,
      value,
      prev: null,
      next: this.head
    };

    if (this.head) {
      this.head.prev = newNode;
    }
    this.head = newNode;

    if (!this.tail) {
      this.tail = newNode;
    }

    this.cache.set(key, newNode);


    if (this.cache.size > this.maxSize) {
      this.removeTail();
    }
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this._hits = 0;
    this._misses = 0;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? this._hits / total : 0,
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  /**
   * Get all keys in cache (from most recent to least recent)
   */
  keys(): string[] {
    const keys: string[] = [];
    let current = this.head;

    while (current) {
      keys.push(current.key);
      current = current.next;
    }

    return keys;
  }

  private moveToFront(node: CacheNode<V>): void {
    if (node === this.head) {
      return;
    }


    this.removeNode(node);


    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode<V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private removeTail(): void {
    if (!this.tail) {
      return;
    }

    const tailNode = this.tail;
    this.cache.delete(tailNode.key);

    this.tail = tailNode.prev;

    if (this.tail) {
      this.tail.next = null;
    } else {

      this.head = null;
    }
  }
}
