import { type AppStorage, createStorageKey } from "@remix-run/fetch-router";

export interface Post {
	id: number;
	title: string;
	content: string;
}

// Default posts to initialize storage with
const DEFAULT_POSTS: Post[] = [
	{ id: 1, title: "A Post", content: "Post content" },
	{ id: 2, title: "Another Post", content: "Another post content" },
];

// Create a storage key for posts
export const POSTS_KEY = createStorageKey<Post[]>(DEFAULT_POSTS);

// Initialize storage with default posts if not already set
function ensurePosts(storage: AppStorage): Post[] {
	// AppStorage.get() requires a default value
	return storage.get(POSTS_KEY);
}

export async function getPost(id: number, storage: AppStorage) {
	const posts = ensurePosts(storage);
	const post = posts.find((p) => p.id === id);
	if (!post) {
		throw new Error(`Post with id ${id} not found`);
	}
	return post;
}

export async function getPosts(storage: AppStorage) {
	return ensurePosts(storage);
}

export async function createPost(
	title: string,
	content: string,
	storage: AppStorage,
): Promise<Post> {
	const posts = ensurePosts(storage);
	const newId = Math.max(0, ...posts.map((p) => p.id)) + 1;
	const newPost: Post = { id: newId, title, content };
	posts.push(newPost);
	storage.set(POSTS_KEY, posts);
	return newPost;
}
