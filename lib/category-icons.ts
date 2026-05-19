import {
  Zap, GraduationCap, Monitor, UtensilsCrossed, Activity, Home,
  ShoppingBag, Car, Plane, TrendingUp, Tag, Briefcase, Laptop,
  BarChart2, CreditCard, Dumbbell, Coffee, ShoppingCart, Gift,
  BookOpen, Music, Banknote, Building2, Heart, Wallet,
  Smartphone, Globe, Package, Wrench, Train, Bus, Bike, Fuel,
  MapPin, Baby, Film, Camera, Phone, Star, Pizza, Scissors,
  Stethoscope, PiggyBank, type LucideIcon,
} from "lucide-react";

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  UtensilsCrossed, Coffee, ShoppingBag, Car, Plane, Home, Building2,
  Briefcase, Laptop, CreditCard, Banknote, Activity, Heart, Dumbbell,
  GraduationCap, BookOpen, Music, Monitor, Gift, Tag, Zap, TrendingUp,
  BarChart2, Wallet, PiggyBank, Smartphone, Globe, Package, Wrench,
  Train, Bus, Bike, Fuel, MapPin, Baby, Film, Camera, Phone, Star,
  Pizza, Scissors, Stethoscope, ShoppingCart,
};

const ICON_MAP: Array<[string[], string]> = [
  [["food", "dining", "eat", "lunch", "dinner", "restaurant", "meal", "snack", "kitchen", "fast food", "beverage", "canteen", "pizza"], "UtensilsCrossed"],
  [["education", "school", "college", "university", "study", "learn", "course", "class", "tuition"], "GraduationCap"],
  [["entertainment", "movie", "film", "cinema", "tv", "show", "ott", "netflix", "stream", "game", "gaming"], "Monitor"],
  [["health", "medical", "doctor", "hospital", "medicine", "pharmacy", "clinic", "wellness", "dental"], "Stethoscope"],
  [["rent", "housing", "house", "home", "apartment", "flat", "pg", "accommodation", "maintenance", "repair"], "Home"],
  [["shopping", "shop", "clothes", "fashion", "apparel", "accessories", "purchase", "mall"], "ShoppingBag"],
  [["transport", "commute", "cab", "auto", "uber", "ola", "petrol", "fuel", "vehicle"], "Car"],
  [["train", "metro", "rail"], "Train"],
  [["bus"], "Bus"],
  [["bike", "cycle", "bicycle"], "Bike"],
  [["travel", "trip", "vacation", "holiday", "flight", "hotel", "tour", "trek", "plane"], "Plane"],
  [["bills", "recharge", "electricity", "water", "internet", "broadband", "utility", "mobile", "phone"], "Zap"],
  [["emi", "loan", "mortgage", "debt", "credit", "insurance"], "CreditCard"],
  [["salary", "paycheck", "earning", "wage", "pay", "stipend"], "TrendingUp"],
  [["freelance", "freelancing", "gig", "contract", "consulting", "project"], "Laptop"],
  [["investment", "invest", "stock", "mutual", "fund", "dividend", "returns", "sip"], "BarChart2"],
  [["business", "profit", "revenue", "sales"], "Briefcase"],
  [["grocery", "groceries", "supermarket", "vegetables", "fruits", "kirana", "market"], "ShoppingCart"],
  [["gym", "workout", "exercise", "sport", "fitness", "yoga", "swimming"], "Dumbbell"],
  [["coffee", "cafe", "tea"], "Coffee"],
  [["music", "concert", "spotify", "song", "event", "party"], "Music"],
  [["gift", "present", "donation", "charity", "giving", "birthday", "celebration"], "Gift"],
  [["book", "magazine", "newspaper", "reading", "library", "stationery"], "BookOpen"],
  [["savings", "save", "piggy", "emergency"], "PiggyBank"],
  [["office", "work", "company", "corporate", "subscription", "software"], "Building2"],
  [["income", "gain", "bonus", "refund", "cashback"], "TrendingUp"],
  [["wallet", "cash", "upi", "neft", "transfer"], "Wallet"],
  [["health insurance", "term", "life", "claim"], "Heart"],
  [["other", "misc", "miscellaneous", "general"], "Tag"],
];

export function getIconKey(name: string): string {
  const lower = name.toLowerCase();
  for (const [keywords, key] of ICON_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return key;
  }
  return "Tag";
}

export function getCategoryIcon(cat: { name: string; icon?: string | null }): LucideIcon {
  if (cat.icon && ICON_REGISTRY[cat.icon]) return ICON_REGISTRY[cat.icon];
  return ICON_REGISTRY[getIconKey(cat.name)] ?? Tag;
}
