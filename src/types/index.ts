export interface AppConfig {
  // RecipeKeeper credentials
  rkEmail: string;
  rkPassword: string;
  // CORS proxy URL for RecipeKeeper (required in production)
  rkProxyUrl: string;
  // Knuspr credentials
  knusprEmail: string;
  knusprPassword: string;
  knusprPrompt: string;
  // OpenAI (for image/URL extraction)
  openaiApiKey: string;
}

export interface ShoppingList {
  Id: string;
  Name: string;
  Position: number;
  IsDeleted: boolean;
  LastModified: string;
}

export interface ShoppingListItem {
  Id: string;
  Name: string;
  ShoppingListId: string;
  IsChecked: boolean;
  CheckedDate: string | null;
  Position: number;
  RecipeId: string | null;
  IsSyncedToExternalList: boolean | null;
  IsDeleted: boolean;
  LastModified: string;
}

export interface ShoppingListCategory {
  Id: string;
  ShoppingListId: string;
  Name: string;
  Position: number;
  IsDeleted: boolean;
  LastModified: string;
}

export interface ShoppingListCategoryItem {
  Id: string;
  ShoppingListId: string;
  ShoppingListCategoryId: string;
  ShoppingListItemId: string;
  IsDeleted: boolean;
  LastModified: string;
}

export interface ShoppingData {
  lists: ShoppingList[];
  items: ShoppingListItem[];
  categories: ShoppingListCategory[];
  categoryItems: ShoppingListCategoryItem[];
}

// Quick list item (volatile, session-only)
export interface QuickListItem {
  id: string;
  name: string;
  checked: boolean;
}
