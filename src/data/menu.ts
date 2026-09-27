import { MenuItem } from '../types/restaurant';

export const RESTAURANT_INFO = {
  name: 'MOONSHINE',
  tables: [
    'Table 1', 'Table 1/1', 'Table 2', 'Table 3', 'Table 4',
    'Table 5', 'Table 6', 'Table 7', 'Table 8', 'Table 9',
    'Table 10', 'Table 11', 'Table 12', 'Table 13', 'Table 14',
    'Table 15', 'Table 16', 'Table 17', 'Table 18', 'Table 19',
    'Table 20',
    'Bar 11', 'Bar 12', 'Bar 13', 'Bar 14', 'Bar 15',
    'Bar 16', 'Bar 17', 'Bar 18', 'Bar 19'
  ]
};

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'bruschetta',
    name: 'Bruschetta (V)',
    category: 'Starters',
    description: 'Crushed cannellini beans, marinated artichokes, lemon, rosemary and crispy breadcrumbs',
    isVegetarian: true,
    popularModifiers: ['No breadcrumbs (GF)', 'Extra lemon', 'Extra artichokes', 'Breadcrumbs on side', 'Rush starter']
  },
  {
    id: 'antipasto-platter',
    name: 'Antipasto Platter',
    category: 'Starters',
    description: 'Spicy salami, prosciutto, mortadella, Parmesan, gorgonzola, provolone, olives, giardiniera and roasted peppers',
    isVegetarian: false,
    popularModifiers: ['Extra olives', 'No gorgonzola', 'Extra bread', 'Mild (no spicy salami)', 'Nut/Allergy alert']
  },
  {
    id: 'whipped-ricotta',
    name: 'Whipped Ricotta & Toasted Baguette',
    category: 'Starters',
    description: 'Lemon, hot honey, black pepper and olive oil',
    isVegetarian: true,
    popularModifiers: ['Extra hot honey', 'Extra baguette', 'Mild honey (no spice)', 'No black pepper']
  },
  {
    id: 'pizza-panini',
    name: 'Pizza Panini',
    category: 'Paninis & Subs',
    description: 'Mozzarella, pepperoni, tomato sauce and oregano on sourdough',
    isVegetarian: false,
    popularModifiers: ['Extra crispy press', 'Extra pepperoni', 'Cut in half', 'Extra mozzarella', 'No oregano']
  },
  {
    id: 'meatball-parmesan-panini',
    name: 'Meatball Parmesan Panini',
    category: 'Paninis & Subs',
    description: 'Beef and pork meatballs, house tomato sauce, mozzarella and Parmesan',
    isVegetarian: false,
    popularModifiers: ['Extra house sauce', 'Well toasted', 'Extra parmesan cheese', 'Cut in half', 'Easy sauce']
  },
  {
    id: 'veggie-panini',
    name: 'Veggie Panini (V)',
    category: 'Paninis & Subs',
    description: 'Marinated zucchini, eggplant, mozzarella cheese, marinated peppers',
    isVegetarian: true,
    popularModifiers: ['Vegan (No cheese)', 'Extra marinated peppers', 'No eggplant', 'Crispy crust', 'Cut in half']
  },
  {
    id: 'gabagool-sub',
    name: 'Gabagool Sub',
    category: 'Paninis & Subs',
    description: 'Thin-sliced capicola, provolone, red wine vinaigrette and giardiniera pickles',
    isVegetarian: false,
    popularModifiers: ['Extra giardiniera pickles', 'Vinaigrette on side', 'Toasted bread', 'Extra capicola', 'Cut in half']
  },
  {
    id: 'italian-sub',
    name: 'Italian Sub',
    category: 'Paninis & Subs',
    description: 'Mortadella, prosciutto, mozzarella cheese, salami, marinated peppers, lettuce and tomato',
    isVegetarian: false,
    popularModifiers: ['No tomato', 'Extra marinated peppers', 'Dressing on side', 'Cut in half', 'Extra lettuce']
  },
  {
    id: 'tiramisu',
    name: 'Tiramisu',
    category: 'Desserts',
    description: 'Espresso-soaked ladyfingers, mascarpone cream and cocoa',
    isVegetarian: true,
    popularModifiers: ['Serve with coffee', 'Extra cocoa powder', 'Birthday candle', 'Serve at end of meal']
  },
  {
    id: 'ricotta-cheesecake',
    name: 'Ricotta Cheesecake',
    category: 'Desserts',
    description: 'Italian ricotta, frutti olive oil, sea salt',
    isVegetarian: true,
    popularModifiers: ['Extra olive oil drizzle', 'Extra sea salt', 'Serve with espresso', 'Room temperature']
  }
];

export const COMMON_ORDER_NOTES = [
  'Rush Order',
  'Serve Starters First',
  'All Courses Together',
  'Allergy Alert (See Dish Note)',
  'Hold for Now'
];
