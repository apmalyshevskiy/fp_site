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
    { externalId: 'p-caesar', categoryExternalId: 'cat-salads', name: 'Цезарь с курицей', description: 'Ромэн, курица, пармезан, соус цезарь', price: 450, isAvailable: true, sortOrder: 1, weightLabel: '280 г' },
    { externalId: 'p-greek', categoryExternalId: 'cat-salads', name: 'Греческий', description: 'Огурцы, томаты, фета, маслины', price: 390, isAvailable: true, sortOrder: 2, weightLabel: '250 г' },
    // Весовые позиции: цена за единицу измерения, заказ дробным количеством
    { externalId: 'p-shashlik', categoryExternalId: 'cat-grill', name: 'Шашлык из свинины', description: 'Маринованная шея, цена за кг', price: 1200, isAvailable: true, sortOrder: 1, unit: 'кг', qtyStep: 0.5, isWeight: true },
    { externalId: 'p-wings', categoryExternalId: 'cat-grill', name: 'Крылышки гриль', description: 'Цена за 100 г', price: 120, isAvailable: true, sortOrder: 2, unit: '100 г', qtyStep: 1, isWeight: true },
    { externalId: 'p-cola', categoryExternalId: 'cat-drinks', name: 'Кола 0.5', description: '', price: 120, isAvailable: true, sortOrder: 1 },
    { externalId: 'p-morse', categoryExternalId: 'cat-drinks', name: 'Морс клюквенный 0.4', description: '', price: 150, isAvailable: false, sortOrder: 2 },
  ],
};

export class MockPosDriver {
  async fetchMenu() {
    return DEMO_MENU;
  }

  async sendOrder(_order) {
    // Имитируем успешную отправку внешнего заказа в POS
    return { externalId: `mock-${nanoid(10)}` };
  }
}
