import type { Metadata } from "next";
import { CategoryManager } from "@/app/components/categories/category-manager";

export const metadata: Metadata = { title: "SuperX · Categorías", description: "Administración de categorías de productos SuperX" };
export default function CategoriesPage() { return <CategoryManager/>; }
