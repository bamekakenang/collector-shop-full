import { useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import type { User } from '../App';

interface ChatWidgetProps {
  user: User;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'other';
  text: string;
  time: string;
}

export function ChatWidget({ user, onClose }: ChatWidgetProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'other',
      text: 'Bonjour ! Je suis intéressé par votre article.',
      time: '10:30'
    },
    {
      id: '2',
      sender: 'user',
      text: 'Bonjour ! Bien sûr, que souhaitez-vous savoir ?',
      time: '10:32'
    },
    {
      id: '3',
      sender: 'other',
      text: "L'article est-il toujours disponible ?",
      time: '10:33'
    }
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: message,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMessage]);
    setMessage('');
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col max-h-[600px] z-50">
      <div className="bg-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <h3>Messagerie</h3>
        </div>
        <button onClick={onClose} className="text-white hover:text-gray-200">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg p-3 ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'}`}
            >
              <p>{msg.text}</p>
              <p className={`mt-1 ${msg.sender === 'user' ? 'text-indigo-200' : 'text-gray-500'}`}>{msg.time}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Tapez votre message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="text-gray-500 mt-2">Note : Les informations personnelles sont filtrées automatiquement</p>
      </form>
    </div>
  );
}