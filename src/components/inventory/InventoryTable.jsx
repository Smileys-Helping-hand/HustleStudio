import PropTypes from 'prop-types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useCallback } from 'react';

const InventoryTable = ({ items, onReorder, onInlineEdit, lowStockThreshold }) => {
  const handleDragEnd = useCallback(
    (result) => {
      if (!result.destination) return;
      const reordered = Array.from(items);
      const [removed] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, removed);
      onReorder(reordered.map((item) => item.id));
    },
    [items, onReorder]
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
      <div className="hidden px-6 py-3 text-xs uppercase tracking-[0.35em] text-white/60 md:grid md:grid-cols-12">
        <span className="col-span-5">Item</span>
        <span className="col-span-2">Category</span>
        <span className="col-span-2 text-right">Quantity</span>
        <span className="col-span-2 text-right">Price</span>
        <span className="col-span-1 text-right">SKU</span>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="inventory-table">
          {(provided) => (
            <ul ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-white/5">
              {items.map((item, index) => {
                const lowStock = (item.quantity ?? 0) <= lowStockThreshold;
                return (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(dragProvided) => (
                      <li
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={`grid grid-cols-1 gap-4 px-6 py-4 transition md:grid-cols-12 ${
                          lowStock ? 'bg-red-500/5' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="col-span-5 flex flex-col">
                          <span className="text-sm font-semibold text-white">{item.name ?? 'Untitled item'}</span>
                          <span className="text-xs text-white/40">Barcode: {item.barcode || '—'}</span>
                        </div>
                        <div className="col-span-2 text-sm text-white/80">{item.category || 'General'}</div>
                        <div className="col-span-2 text-right">
                          <input
                            type="number"
                            min="0"
                            defaultValue={item.quantity ?? 0}
                            onBlur={(event) =>
                              onInlineEdit(item.id, { quantity: Number(event.target.value || 0) })
                            }
                            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-right text-sm text-white focus:border-indigo-400 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={item.price ?? 0}
                            onBlur={(event) =>
                              onInlineEdit(item.id, { price: Number(event.target.value || 0) })
                            }
                            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-right text-sm text-white focus:border-indigo-400 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1 text-right text-xs text-white/50">{item.sku || '—'}</div>
                      </li>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

InventoryTable.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  onReorder: PropTypes.func.isRequired,
  onInlineEdit: PropTypes.func.isRequired,
  lowStockThreshold: PropTypes.number,
};

InventoryTable.defaultProps = {
  lowStockThreshold: 10,
};

export default InventoryTable;
