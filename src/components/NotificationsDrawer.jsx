import { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dialog, Transition } from '@headlessui/react';
import { FiBellOff, FiCheckCircle } from 'react-icons/fi';
import { useNotifications } from '../context/NotificationContext.jsx';

const formatTimestamp = (value) => {
  try {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString();
  } catch (error) {
    console.warn('Unable to format timestamp', error);
    return '';
  }
};

export default function NotificationsDrawer({ open, onClose }) {
  const { notifications, markAsRead, clearNotifications } = useNotifications();
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-y-0 right-0 flex max-w-full">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in-out duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="pointer-events-auto w-screen max-w-md border-l border-white/10 bg-[#12111a] p-6 shadow-[0_0_30px_rgba(12,10,30,0.55)]">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-lg font-semibold text-white">Notifications</Dialog.Title>
                <button
                  type="button"
                  onClick={() => {
                    clearNotifications();
                    onClose();
                  }}
                  className="text-xs uppercase tracking-[0.3em] text-white/40 transition hover:text-white/80"
                >
                  Clear all
                </button>
              </div>

              <div className="mt-6 space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '70vh' }}>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
                    <FiBellOff className="text-2xl" />
                    <p>All systems calm — no alerts right now.</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <article
                      key={notification.id}
                      className={`rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 shadow-[0_0_20px_rgba(99,102,241,0.1)] ${
                        notification.read ? 'opacity-70' : 'opacity-100'
                      }`}
                    >
                      <header className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-white">{notification.title}</h3>
                          {notification.description && (
                            <p className="mt-1 text-xs text-white/60">{notification.description}</p>
                          )}
                        </div>
                        {!notification.read && (
                          <button
                            type="button"
                            className="rounded-full border border-white/10 bg-white/10 p-1 text-xs text-white/70 transition hover:bg-indigo-500/40 hover:text-white"
                            onClick={() => markAsRead(notification.id)}
                            aria-label="Mark notification as read"
                          >
                            <FiCheckCircle />
                          </button>
                        )}
                      </header>
                      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/40">
                        <span>{formatTimestamp(notification.createdAt)}</span>
                        {notification.type && <span className="uppercase tracking-[0.35em]">{notification.type}</span>}
                      </footer>
                    </article>
                  ))
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

NotificationsDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
