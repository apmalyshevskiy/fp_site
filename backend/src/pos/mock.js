import { nanoid } from 'nanoid';

// Демо-меню для разработки и демонстрации без реального FUSIONPOS
const DEMO_MENU = {
  categories: [
    { externalId: 'cat-pizza', name: 'Пицца', sortOrder: 1 },
    { externalId: 'cat-salads', name: 'Салаты', sortOrder: 2 },
    { externalId: 'cat-grill', name: 'Гриль', sortOrder: 3 },
    { externalId: 'cat-drinks', name: 'Напитки', sortOrder: 4 },
  ],
  products: [
    { externalId: 'p-margherita', categoryExternalId: 'cat-pizza', name: 'Маргарита', description: 'Томатный соус, моцарелла, базилик', price: 590, isAvailable: true, sortOrder: 1, weightLabel: '450 г' },
    { externalId: 'p-pepperoni', categoryExternalId: 'cat-pizza', name: 'Пепперони', description: 'Томатный соус, моцарелла, пепперони', price: 690, isAvailable: true, sortOrder: 2, weightLabel: '480 г' },
    { externalId: 'p-four-cheese', categoryExternalId: 'cat-pizza', name: 'Четыре сыра', description: 'Моцарелла, горгонзола, пармезан, чеддер', price: 750, isAvailable: true, sortOrder: 3, weightLabel: '510 г' },
    { externalId: 'p-hawaiian', categoryExternalId: 'cat-pizza', name: 'Гавайская', description: 'Курица, ананас, моцарелла', price: 650, isAvailable: true, sortOrder: 4, weightLabel: '470 г' },
    { externalId: 'p-bbq', categoryExternalId: 'cat-pizza', name: 'Барбекю', description: 'Курица, соус барбекю, лук, моцарелла', price: 670, isAvailable: true, sortOrder: 5, weightLabel: '480 г' },
    { externalId: 'p-mexicana', categoryExternalId: 'cat-pizza', name: 'Мексиканская', description: 'Говядина, перец халапеньо, кукуруза, томаты', price: 710, isAvailable: true, sortOrder: 6, weightLabel: '490 г' },
    { externalId: 'p-quattro-stagioni', categoryExternalId: 'cat-pizza', name: 'Кватро Стаджони', description: 'Ветчина, грибы, оливки, артишоки', price: 730, isAvailable: true, sortOrder: 7, weightLabel: '500 г' },
    { externalId: 'p-cheese-classic', categoryExternalId: 'cat-pizza', name: 'Сырная классика', description: 'Моцарелла, пармезан, дор блю, соус альфредо', price: 700, isAvailable: true, sortOrder: 8, weightLabel: '460 г' },
    { externalId: 'p-vegetarian', categoryExternalId: 'cat-pizza', name: 'Вегетарианская', description: 'Томаты, перец, кабачки, брокколи, моцарелла', price: 600, isAvailable: true, sortOrder: 9, weightLabel: '440 г' },
    { externalId: 'p-meat', categoryExternalId: 'cat-pizza', name: 'Мясная', description: 'Говядина, ветчина, бекон, пепперони', price: 780, isAvailable: true, sortOrder: 10, weightLabel: '520 г' },
    { externalId: 'p-diablo', categoryExternalId: 'cat-pizza', name: 'Дьябло', description: 'Острая пепперони, халапеньо, чили-масло', price: 720, isAvailable: true, sortOrder: 11, weightLabel: '480 г' },
    { externalId: 'p-seafood', categoryExternalId: 'cat-pizza', name: 'Морская', description: 'Креветки, кальмары, мидии, моцарелла', price: 820, isAvailable: true, sortOrder: 12, weightLabel: '500 г' },

    { externalId: 'p-caesar', categoryExternalId: 'cat-salads', name: 'Цезарь с курицей', description: 'Ромэн, курица, пармезан, соус цезарь', price: 450, isAvailable: true, sortOrder: 1, weightLabel: '280 г' },
    { externalId: 'p-greek', categoryExternalId: 'cat-salads', name: 'Греческий', description: 'Огурцы, томаты, фета, маслины', price: 390, isAvailable: true, sortOrder: 2, weightLabel: '250 г' },
    { externalId: 'p-caprese', categoryExternalId: 'cat-salads', name: 'Капрезе', description: 'Томаты, моцарелла, базилик, песто', price: 420, isAvailable: true, sortOrder: 3, weightLabel: '230 г' },
    { externalId: 'p-olivier', categoryExternalId: 'cat-salads', name: 'Оливье', description: 'Картофель, курица, яйцо, горошек, майонез', price: 350, isAvailable: true, sortOrder: 4, weightLabel: '250 г' },
    { externalId: 'p-vinegret', categoryExternalId: 'cat-salads', name: 'Винегрет', description: 'Свёкла, картофель, морковь, квашеная капуста', price: 300, isAvailable: true, sortOrder: 5, weightLabel: '230 г' },
    { externalId: 'p-warm-beef', categoryExternalId: 'cat-salads', name: 'Тёплый салат с говядиной', description: 'Говядина, руккола, томаты черри', price: 490, isAvailable: true, sortOrder: 6, weightLabel: '260 г' },
    { externalId: 'p-shrimp-salad', categoryExternalId: 'cat-salads', name: 'Салат с креветками', description: 'Креветки, авокадо, микс салатов', price: 520, isAvailable: true, sortOrder: 7, weightLabel: '250 г' },
    { externalId: 'p-beet-goat', categoryExternalId: 'cat-salads', name: 'Свекольный с козьим сыром', description: 'Свёкла, козий сыр, грецкий орех', price: 410, isAvailable: true, sortOrder: 8, weightLabel: '220 г' },
    { externalId: 'p-veg-mix', categoryExternalId: 'cat-salads', name: 'Овощной микс', description: 'Сезонные овощи, оливковое масло', price: 320, isAvailable: true, sortOrder: 9, weightLabel: '250 г' },
    { externalId: 'p-tuna-salad', categoryExternalId: 'cat-salads', name: 'Салат с тунцом', description: 'Тунец, яйцо, огурцы, оливки', price: 440, isAvailable: true, sortOrder: 10, weightLabel: '240 г' },

    // Весовые позиции: цена за единицу измерения, заказ дробным количеством
    { externalId: 'p-shashlik', categoryExternalId: 'cat-grill', name: 'Шашлык из свинины', description: 'Маринованная шея, цена за кг', price: 1200, isAvailable: true, sortOrder: 1, unit: 'кг', qtyStep: 0.5, isWeight: true },
    { externalId: 'p-wings', categoryExternalId: 'cat-grill', name: 'Крылышки гриль', description: 'Цена за 100 г', price: 120, isAvailable: true, sortOrder: 2, unit: '100 г', qtyStep: 1, isWeight: true },
    { externalId: 'p-chicken-skewer', categoryExternalId: 'cat-grill', name: 'Шашлык из курицы', description: 'Маринованное бедро, цена за кг', price: 950, isAvailable: true, sortOrder: 3, unit: 'кг', qtyStep: 0.5, isWeight: true },
    { externalId: 'p-lamb-skewer', categoryExternalId: 'cat-grill', name: 'Шашлык из баранины', description: 'Маринованная корейка, цена за кг', price: 1450, isAvailable: true, sortOrder: 4, unit: 'кг', qtyStep: 0.5, isWeight: true },
    { externalId: 'p-beef-steak', categoryExternalId: 'cat-grill', name: 'Стейк из говядины', description: 'Мраморная говядина, соус на выбор', price: 990, isAvailable: true, sortOrder: 5, weightLabel: '300 г' },
    { externalId: 'p-lulya', categoryExternalId: 'cat-grill', name: 'Люля-кебаб', description: 'Из говядины и баранины, на углях', price: 480, isAvailable: true, sortOrder: 6, weightLabel: '200 г' },
    { externalId: 'p-ribs-bbq', categoryExternalId: 'cat-grill', name: 'Рёбрышки BBQ', description: 'Свиные рёбра в соусе барбекю', price: 690, isAvailable: true, sortOrder: 7, weightLabel: '350 г' },
    { externalId: 'p-grilled-veg', categoryExternalId: 'cat-grill', name: 'Овощи гриль', description: 'Сезонные овощи на углях', price: 350, isAvailable: true, sortOrder: 8, weightLabel: '250 г' },
    { externalId: 'p-chicken-fillet', categoryExternalId: 'cat-grill', name: 'Куриное филе гриль', description: 'Филе бедра на углях с зеленью', price: 420, isAvailable: true, sortOrder: 9, weightLabel: '220 г' },
    { externalId: 'p-sausages', categoryExternalId: 'cat-grill', name: 'Колбаски гриль', description: 'Домашние колбаски на углях', price: 390, isAvailable: true, sortOrder: 10, weightLabel: '200 г' },

    { externalId: 'p-cola', categoryExternalId: 'cat-drinks', name: 'Кола 0.5', description: '', price: 120, isAvailable: true, sortOrder: 1 },
    { externalId: 'p-morse', categoryExternalId: 'cat-drinks', name: 'Морс клюквенный 0.4', description: '', price: 150, isAvailable: false, sortOrder: 2 },
    { externalId: 'p-lemonade-mojito', categoryExternalId: 'cat-drinks', name: 'Лимонад Мохито 0.4', description: 'Лайм, мята, содовая', price: 220, isAvailable: true, sortOrder: 3 },
    { externalId: 'p-black-tea', categoryExternalId: 'cat-drinks', name: 'Чай чёрный', description: 'Чайник 400 мл', price: 190, isAvailable: true, sortOrder: 4 },
    { externalId: 'p-green-tea', categoryExternalId: 'cat-drinks', name: 'Чай зелёный', description: 'Чайник 400 мл', price: 190, isAvailable: true, sortOrder: 5 },
    { externalId: 'p-cappuccino', categoryExternalId: 'cat-drinks', name: 'Капучино', description: '300 мл', price: 210, isAvailable: true, sortOrder: 6 },
    { externalId: 'p-americano', categoryExternalId: 'cat-drinks', name: 'Американо', description: '300 мл', price: 170, isAvailable: true, sortOrder: 7 },
    { externalId: 'p-orange-juice', categoryExternalId: 'cat-drinks', name: 'Сок апельсиновый 0.3', description: 'Свежевыжатый', price: 250, isAvailable: true, sortOrder: 8 },
    { externalId: 'p-still-water', categoryExternalId: 'cat-drinks', name: 'Вода негазированная 0.5', description: '', price: 100, isAvailable: true, sortOrder: 9 },
    { externalId: 'p-kompot', categoryExternalId: 'cat-drinks', name: 'Компот домашний 0.4', description: '', price: 160, isAvailable: true, sortOrder: 10 },
  ],
};

export class MockPosDriver {
  async fetchMenu() {
    return {
      categories: DEMO_MENU.categories,
      // Демо-фото (Wikimedia Commons, свободные лицензии — см.
      // frontend/public/demo/ATTRIBUTIONS.md) раздаются собранным фронтом.
      // Синк подставит их только там, где своя картинка ещё не загружена.
      products: DEMO_MENU.products.map((p) => ({ ...p, imageUrl: `/demo/${p.externalId}.jpg` })),
    };
  }

  async sendOrder(_order) {
    // Имитируем успешную отправку внешнего заказа в POS
    return { externalId: `mock-${nanoid(10)}` };
  }
}
