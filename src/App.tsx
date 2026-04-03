/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, ReactNode, useMemo } from 'react';
import { Mic, Phone, Keyboard, X, Check, AlertTriangle, ChevronRight, Volume2, VolumeX, Video, Share2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { TouchFeedback } from './components/TouchFeedback';

type AppState = 'WELCOME' | 'MAIN' | 'VOICE' | 'SUMMARY';
type DeliveryStatus = 'RECOMMENDING' | 'DELIVERING' | 'DELIVERED';
type VoiceViewMode = 'RECOMMEND' | 'CHAT';
type VoiceStep = 'MEAL_SELECT' | 'MEAT_SELECT' | 'SPEC_SELECT' | 'ADDRESS_CONFIRM' | 'ORDER_PLACING' | 'CS_MAIN' | 'CS_ADDRESS_INPUT';

interface Meal {
  id: number;
  image: string;
  name: string;
  shop: string;
  desc: string;
  reason: string;
  deliveryTime: string;
  hasSpecs: boolean;
}

const MEALS: Meal[] = [
  { 
    id: 1,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&h=450', 
    name: '番茄牛肉面', 
    shop: '老街面馆', 
    desc: '软糯清淡，好消化',
    reason: '清淡好消化，不油腻',
    deliveryTime: '25分钟',
    hasSpecs: true
  },
  { 
    id: 2,
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&h=450', 
    name: '小炒肉套餐', 
    shop: '健康小厨', 
    desc: '营养均衡，少油少盐',
    reason: '小炒肉，下饭香',
    deliveryTime: '35分钟',
    hasSpecs: true
  },
  { 
    id: 3,
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&h=450', 
    name: '手工猪肉大葱水饺', 
    shop: '大娘水饺', 
    desc: '皮薄馅大，汤汁鲜美',
    reason: '皮薄馅大，您爱吃的味',
    deliveryTime: '30分钟',
    hasSpecs: false
  },
  { 
    id: 4,
    image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&h=450', 
    name: '番茄鲜虾烩饭', 
    shop: '轻食西餐厅', 
    desc: '酸甜开胃，鲜虾Q弹',
    reason: '番茄浓郁开胃，鲜虾补充优质蛋白',
    deliveryTime: '35分钟',
    hasSpecs: false
  },
  { 
    id: 5,
    image: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?auto=format&fit=crop&w=600&h=450', 
    name: '照烧鸡腿饭', 
    shop: '吉野家', 
    desc: '咸甜适口，鸡肉滑嫩',
    reason: '经典照烧风味，好吃不贵',
    deliveryTime: '30分钟',
    hasSpecs: false
  },
  { 
    id: 6,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&h=450', 
    name: '清炒时蔬', 
    shop: '健康小厨', 
    desc: '清淡解腻，补充维生素',
    reason: '绿色健康，清肠胃',
    deliveryTime: '25分钟',
    hasSpecs: false
  },
];

const ThinkingDots = () => (
  <div className="flex gap-1.5 items-center h-10">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.3, 1, 0.3] 
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 1.2, 
          delay: i * 0.2,
          ease: "easeInOut"
        }}
        className="w-2.5 h-2.5 bg-black/20 rounded-full"
      />
    ))}
  </div>
);

interface VoiceMessageProps {
  isThinking: boolean;
  isTyping: boolean;
  displayedChatText: string;
  children?: ReactNode;
  textClassName?: string;
  cursorClassName?: string;
}

const VoiceMessage = ({ 
  isThinking, 
  isTyping, 
  displayedChatText, 
  children, 
  textClassName = "text-[32px]",
  cursorClassName = "w-1 h-8"
}: VoiceMessageProps) => (
  <div className="flex flex-col gap-3">
    <div className={`${textClassName} text-text-main leading-tight font-bold tracking-tight`}>
      {isThinking ? <ThinkingDots /> : (
        <>
          {displayedChatText}
          {isTyping && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
              className={`inline-block bg-black/20 ml-1 align-middle ${cursorClassName}`}
            />
          )}
        </>
      )}
    </div>
    {!isThinking && !isTyping && children}
  </div>
);

export default function App() {
  const [appState, setAppState] = useState<AppState>('WELCOME');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('RECOMMENDING');
  const [mealIndex, setMealIndex] = useState(0);
  const [changeCount, setChangeCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [voiceViewMode, setVoiceViewMode] = useState<VoiceViewMode>('RECOMMEND');
  const [voiceMeals, setVoiceMeals] = useState<Meal[]>([MEALS[0], MEALS[1]]);
  const [chatText, setChatText] = useState('');
  const [displayedChatText, setDisplayedChatText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [voiceStep, setVoiceStep] = useState<VoiceStep>('MEAL_SELECT');
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('朝阳区望京街道XX小区6号楼2单元1203室');

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // 动态获取当前页面的地址，确保链接始终有效
  const sharedUrl = window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const hour = currentTime.getHours();
  const greeting = hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

  const currentMeal = MEALS[mealIndex];

  const estimatedTime = useMemo(() => {
    const minutes = parseInt(currentMeal.deliveryTime.replace(/\D/g, '')) || 30;
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }, [currentMeal.deliveryTime]);

  const deliveredTime = useMemo(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }, [deliveryStatus]);

  // Typewriter effect for chat
  useEffect(() => {
    if (chatText) {
      setDisplayedChatText('');
      setIsTyping(true);
      let i = 0;
      const interval = setInterval(() => {
        setDisplayedChatText(chatText.slice(0, i + 1));
        i++;
        if (i >= chatText.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 100); 
      return () => {
        clearInterval(interval);
        setIsTyping(false);
      };
    }
  }, [chatText]);

  // Voice Synthesis Logic
  const speak = (text: string) => {
    setChatText(text);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  useEffect(() => {
    if (appState === 'MAIN') {
      const timer = setTimeout(() => {
        let text = '';
        if (deliveryStatus === 'RECOMMENDING') {
          text = `今天为您推荐${currentMeal.name}，来自${currentMeal.shop}。推荐理由是：${currentMeal.reason}。家人已安排好，无需您付款。`;
        } else if (deliveryStatus === 'DELIVERING') {
          text = `您的${currentMeal.name}正在配送中，预计13点05分到达，注意听敲门声。`;
        } else if (deliveryStatus === 'DELIVERED') {
          text = `您的${currentMeal.name}已送到啦，用餐愉快！`;
        } else if (deliveryStatus === 'EXCEPTION') {
          text = `配送有点慢，家人已收到通知，请稍等。`;
        }
        speak(text);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [appState, deliveryStatus, mealIndex]);

  // Voice Interaction Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (appState === 'VOICE') {
      interval = setInterval(() => {
        setVoiceTimer(prev => prev + 1);
      }, 1000);
    } else {
      setVoiceTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [appState]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOrder = () => {
    setDeliveryStatus('DELIVERING');
  };

  const handleChangeMeal = () => {
    setMealIndex((prev) => (prev + 1) % MEALS.length);
    setChangeCount((prev) => prev + 1);
    
    // If user has changed many times, give a gentle suggestion but still allow the change
    if (changeCount >= 3) {
      speak('要不就它？这道菜最适合您今天的口味。');
    }
  };

  const startVoice = () => {
    setAppState('VOICE');
    setVoiceViewMode('RECOMMEND');
    setSelectedMeal(null);
    setSelectedSpec(null);
    setIsTransitioning(false);
    setIsThinking(true);
    setIsMuted(false); // Default speakerphone ON
    setDisplayedChatText('');

    if (deliveryStatus === 'DELIVERING') {
      setVoiceStep('CS_MAIN');
      setTimeout(() => {
        setIsThinking(false);
        speak('您好，这里是智能客服。您的订单正在由骑手配送中。请问您遇到了什么问题？催单请按1，修改地址请按2，联系骑手请按3。');
      }, 1000);
    } else {
      setVoiceStep('MEAL_SELECT');
      setVoiceMeals([MEALS[0], MEALS[1]]);
      setTimeout(() => {
        setIsThinking(false);
        speak(`您好！我是美团外卖订餐助手。想吃${MEALS[0].name}选1，想吃${MEALS[1].name}选2，换一批选3。`);
      }, 1000);
    }
  };

  const handleDial = (num: string) => {
    if (isTransitioning || appState !== 'VOICE') return;

    const handleMealSelect = (n: string) => {
      if (n === '1' || n === '2') {
        const selected = voiceMeals[parseInt(n) - 1];
        setSelectedMeal(selected);
        setIsTransitioning(true);
        setIsThinking(true);
        setDisplayedChatText('');
        
        setTimeout(() => {
          setIsThinking(false);
          setIsTransitioning(false);
          if (selected.name.includes('小炒肉')) {
            setVoiceStep('MEAT_SELECT');
            speak('想吃猪肉的小炒肉选1，牛肉的小炒肉选2');
          } else if (selected.hasSpecs) {
            setVoiceStep('SPEC_SELECT');
            speak('想要免辣选1，微辣选2，中辣选3');
          } else {
            setVoiceStep('ADDRESS_CONFIRM');
            speak(`送到${deliveryAddress}吗？是的话选1，地址不对选2`);
          }
        }, 1000);
      } else if (n === '3') {
        setIsThinking(true);
        setDisplayedChatText('');
        
        const currentIndex = MEALS.findIndex(m => m.id === voiceMeals[0].id);
        const nextIndex = (currentIndex + 2) % MEALS.length;
        const nextMeals = [MEALS[nextIndex], MEALS[nextIndex + 1]];
        
        setVoiceMeals(nextMeals);
        setTimeout(() => {
          setIsThinking(false);
          speak(`没问题，再给您换两个菜。想吃${nextMeals[0].name}选1，想吃${nextMeals[1].name}选2，继续换一批请选3。`);
        }, 1000);
      } else if (n === '0') {
        setVoiceViewMode('CHAT');
        const weatherReply = "今天天气挺好的，阳光很暖和，吃完饭可以去阳台坐坐。咱们还是先选午饭吧，您想吃哪个？";
        setChatText(weatherReply);
        speak(weatherReply);
        setTimeout(() => {
          setVoiceViewMode('RECOMMEND');
        }, 6000);
      }
    };

    const handleMeatSelect = (n: string) => {
      if (n === '1' || n === '2') {
        const meat = n === '1' ? '猪肉' : '牛肉';
        if (selectedMeal) {
          setSelectedMeal({ ...selectedMeal, name: `${meat}${selectedMeal.name}` });
        }
        setIsTransitioning(true);
        setIsThinking(true);
        setDisplayedChatText('');
        
        setTimeout(() => {
          setIsThinking(false);
          setIsTransitioning(false);
          if (selectedMeal?.hasSpecs) {
            setVoiceStep('SPEC_SELECT');
            speak('想要免辣选1，微辣选2，中辣选3');
          } else {
            setVoiceStep('ADDRESS_CONFIRM');
            speak(`送到${deliveryAddress}吗？是的话选1，地址不对选2`);
          }
        }, 1000);
      }
    };

    const handleSpecSelect = (n: string) => {
      const specs = ['免辣', '微辣', '中辣'];
      if (n === '1' || n === '2' || n === '3') {
        setSelectedSpec(specs[parseInt(n) - 1]);
        setIsTransitioning(true);
        setIsThinking(true);
        setDisplayedChatText('');
        
        setTimeout(() => {
          setIsThinking(false);
          setIsTransitioning(false);
          setVoiceStep('ADDRESS_CONFIRM');
          speak(`送到${deliveryAddress}吗？是的话选1，地址不对选2`);
        }, 1000);
      }
    };

    const handleAddressConfirm = (n: string) => {
      if (n === '1') {
        setIsTransitioning(true);
        setVoiceStep('ORDER_PLACING');
        speak('正在帮您下单，请稍等…');
        setTimeout(() => {
          speak(`下单成功！骑手预计${selectedMeal?.deliveryTime || '30分钟'}送达`);
          setTimeout(() => {
            endVoice(true, `✓ 已帮您下单：${selectedMeal?.name}`);
          }, 2000);
        }, 2000);
      } else if (n === '2') {
        setIsTransitioning(true);
        speak('好的，请告诉我您的新地址');
        setTimeout(() => {
          setIsTransitioning(false);
          setIsListening(true);
          setTranscribedText('');
          
          const fullText = "嗯... 我现在在... 朝阳区望京街道XX小区... 8号楼1单元502室";
          let i = 0;
          const interval = setInterval(() => {
            setTranscribedText(fullText.slice(0, i + 1));
            i++;
            if (i >= fullText.length) clearInterval(interval);
          }, 80);

          setTimeout(() => {
            clearInterval(interval); // Fix: Ensure interval is cleared
            setIsListening(false);
            setIsThinking(true);
            setDisplayedChatText('');
            setTimeout(() => {
              setIsThinking(false);
              setDeliveryAddress('朝阳区望京街道XX小区8号楼1单元502室');
              speak('收到，地址已更新为：朝阳区望京街道XX小区8号楼1单元502室。送到这里吗？是的话选1，地址不对选2');
            }, 1000);
          }, 5000);
        }, 2000);
      }
    };

    const handleCSMain = (n: string) => {
      if (n === '1') {
        setIsThinking(true);
        setDisplayedChatText('');
        setTimeout(() => {
          setIsThinking(false);
          speak('已为您加急催单，骑手正在全速赶往您的地址，请您再耐心等待一下。');
          setTimeout(() => {
            endVoice(true, '✓ 已为您加急催单');
          }, 4000);
        }, 1000);
      } else if (n === '2') {
        setIsTransitioning(true);
        setVoiceStep('CS_ADDRESS_INPUT');
        speak('好的，请告诉我您的新地址');
        setTimeout(() => {
          setIsTransitioning(false);
          setIsListening(true);
          setTranscribedText('');
          
          const fullText = "嗯... 我现在在... 朝阳区望京街道XX小区... 8号楼1单元502室";
          let i = 0;
          const interval = setInterval(() => {
            setTranscribedText(fullText.slice(0, i + 1));
            i++;
            if (i >= fullText.length) clearInterval(interval);
          }, 80);

          setTimeout(() => {
            clearInterval(interval);
            setIsListening(false);
            setIsThinking(true);
            setDisplayedChatText('');
            setTimeout(() => {
              setIsThinking(false);
              setDeliveryAddress('朝阳区望京街道XX小区8号楼1单元502室');
              speak('收到，地址已为您修改成功。骑手将送到：朝阳区望京街道XX小区8号楼1单元502室。');
              setTimeout(() => {
                endVoice(true, '✓ 地址已修改成功');
              }, 6000);
            }, 1000);
          }, 5000);
        }, 2000);
      } else if (n === '3') {
        setIsThinking(true);
        setDisplayedChatText('');
        setTimeout(() => {
          setIsThinking(false);
          speak('正在为您转接骑手电话，请稍候...');
          setTimeout(() => {
            endVoice(true, '📞 正在呼叫骑手...');
          }, 3000);
        }, 1000);
      }
    };

    switch (voiceStep) {
      case 'MEAL_SELECT': handleMealSelect(num); break;
      case 'MEAT_SELECT': handleMeatSelect(num); break;
      case 'SPEC_SELECT': handleSpecSelect(num); break;
      case 'ADDRESS_CONFIRM': handleAddressConfirm(num); break;
      case 'CS_MAIN': handleCSMain(num); break;
      default: break;
    }
  };

  const endVoice = (success = true, customText?: string) => {
    if (success) {
      setSummaryText(customText || `✓ 已帮您下单：${currentMeal.name}`);
      setDeliveryStatus('DELIVERING');
    } else {
      setSummaryText('您说想换一道，推荐已更新');
      setMealIndex((mealIndex + 1) % MEALS.length);
    }
    setAppState('SUMMARY');
    setTimeout(() => {
      setAppState('MAIN');
    }, 3000);
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center overflow-hidden bg-bg-warm sm:bg-gray-200">
      <TouchFeedback />
      <div className="phone-shell">
        {/* iOS Status Bar */}
        <div className="absolute top-0 left-0 right-0 pt-[env(safe-area-inset-top)] sm:pt-0 h-[calc(44px+env(safe-area-inset-top))] sm:h-11 px-6 flex items-center justify-between z-[100] pointer-events-none">
          <div className="text-[14px] font-bold text-black/80 w-16 hidden sm:block">{timeString}</div>
          
          {/* Demo Status Switcher - Centered in Status Bar (Desktop Only) */}
          <div className="pointer-events-auto hidden sm:flex gap-1 bg-black/5 p-0.5 rounded-full scale-95 mx-auto sm:mx-0">
            {(['RECOMMENDING', 'DELIVERING', 'DELIVERED'] as DeliveryStatus[]).map(s => (
              <button
                key={s}
                onClick={() => {
                  setDeliveryStatus(s);
                  stopSpeaking();
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors ${deliveryStatus === s ? 'bg-primary font-bold text-black' : 'bg-transparent text-black/40'}`}
              >
                {s === 'RECOMMENDING' ? '推荐' : s === 'DELIVERING' ? '配送' : '送达'}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 w-16 justify-end">
            <div className="flex gap-0.5 items-end h-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`w-0.5 rounded-full bg-black/80 ${i === 4 ? 'h-3' : i === 3 ? 'h-2.5' : i === 2 ? 'h-2' : 'h-1.5'}`} />
              ))}
            </div>
            <div className="text-[12px] font-bold text-black/80">5G</div>
            <div className="w-6 h-3 border border-black/30 rounded-[3px] p-[1px] relative">
              <div className="h-full bg-black/80 rounded-[1px] w-4/5" />
              <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[2px] h-[4px] bg-black/30 rounded-r-full" />
            </div>
          </div>
        </div>

        {/* Voice Stop Overlay */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={stopSpeaking}
              className="absolute top-[50px] right-4 z-[60] bg-black/50 text-white px-3 py-1.5 rounded-full text-[12px] flex items-center gap-1 backdrop-blur-sm"
            >
              <VolumeX size={14} /> 停止
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* P-01: Welcome Page */}
          {appState === 'WELCOME' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col px-8 safe-top safe-bottom"
            >
              <div className="mt-20 flex flex-col items-center">
                <div className="w-[200px] h-[200px] bg-primary/20 rounded-full flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary opacity-10 animate-pulse"></div>
                  <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Background Circle */}
                    <circle cx="50" cy="50" r="45" fill="#FFE346" fillOpacity="0.3" />
                    
                    {/* Father/Mother Figure */}
                    <circle cx="35" cy="40" r="10" fill="#1A1A1A" />
                    <path d="M15 75C15 60 25 55 35 55C45 55 55 60 55 75" fill="#1A1A1A" />
                    
                    {/* Child Figure */}
                    <circle cx="65" cy="50" r="8" fill="#1A1A1A" opacity="0.8" />
                    <path d="M50 80C50 70 58 65 65 65C72 65 80 70 80 80" fill="#1A1A1A" opacity="0.8" />
                    
                    {/* Heart connecting them */}
                    <path d="M50 45C50 45 48 40 45 40C42 40 40 43 40 46C40 50 50 55 50 55C50 55 60 50 60 46C60 43 58 40 55 40C52 40 50 45 50 45Z" fill="#FF4B4B" />
                  </svg>
                </div>
                <h1 className="text-[28px] font-bold mt-10 text-text-main">美团外卖，安心的一餐</h1>
                <div className="mt-6 text-center text-text-sub text-[16px] leading-[1.8]">
                  <p>每天这里会推荐今天吃什么</p>
                  <p>告诉助手想吃什么，饭就送到门口</p>
                  <p>无需您付款，放心点</p>
                </div>
                
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="mt-8 flex items-center gap-2 px-4 py-2 bg-black/5 rounded-full text-[14px] text-text-sub hover:bg-black/10 transition-colors"
                >
                  <Share2 size={16} /> 分享给家人体验
                </button>
              </div>
              <div className="mt-auto">
                <button onClick={() => setAppState('MAIN')} className="btn-primary">好的，知道了</button>
              </div>

              {/* Share Modal */}
              <AnimatePresence>
                {showShareModal && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="bg-white w-full max-w-[320px] rounded-[40px] p-8 flex flex-col items-center shadow-2xl"
                    >
                      <div className="w-full flex justify-end mb-2">
                        <button 
                          onClick={() => setShowShareModal(false)}
                          className="w-8 h-8 flex items-center justify-center bg-black/5 rounded-full text-text-sub"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      
                      <h3 className="text-[22px] font-bold text-text-main mb-2">扫码体验</h3>
                      <p className="text-[14px] text-text-sub text-center mb-8">让家人在手机上也能直接订餐</p>
                      
                      <div className="bg-white p-4 rounded-3xl shadow-inner border border-black/5 mb-8">
                        <QRCodeSVG 
                          value={sharedUrl}
                          size={180}
                          level="H"
                          includeMargin={false}
                          imageSettings={{
                            src: "https://www.meituan.com/favicon.ico",
                            x: undefined,
                            y: undefined,
                            height: 30,
                            width: 30,
                            excavate: true,
                          }}
                        />
                      </div>
                      
                      <button 
                        onClick={handleCopyLink}
                        className="w-full py-4 bg-primary rounded-2xl font-bold text-text-main flex items-center justify-center gap-2 active:scale-95 transition-transform"
                      >
                        {copySuccess ? <Check size={20} /> : <Copy size={20} />}
                        {copySuccess ? '链接已复制' : '复制分享链接'}
                      </button>
                      
                      <p className="mt-6 text-[12px] text-text-hint text-center leading-relaxed">
                        链接有效期内，任何人扫码即可进入<br/>
                        建议使用手机浏览器打开以获得最佳体验
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* P-02: Main Interface */}
          {appState === 'MAIN' && (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-h-0 flex flex-col"
            >
              {/* Area 2: Main Card */}
              <div className="flex-1 min-h-0 px-6 pt-12 pb-4 flex flex-col overflow-y-auto">
                <div className="card flex-1 flex flex-col min-h-0 relative">
                  {/* Greeting inside card */}
                  <div className="mb-4 shrink-0">
                    <span className="text-text-main text-[20px] font-bold">
                      现在是 {timeString}，{greeting}！
                    </span>
                  </div>

                  {deliveryStatus === 'RECOMMENDING' && (
                    <>
                      <div className="flex-1 flex flex-col items-center justify-center py-2 min-h-0 overflow-hidden">
                        <img 
                          src={currentMeal.image} 
                          alt={currentMeal.name}
                          referrerPolicy="no-referrer"
                          className="w-full aspect-square object-cover rounded-2xl shadow-md shrink-0"
                        />
                        <h2 className="text-[26px] font-bold mt-4 text-center">{currentMeal.name}</h2>
                        <div className="flex items-center gap-2 mt-1 shrink-0">
                          <p className="text-text-sub text-[16px]">{currentMeal.shop}</p>
                          <span className="text-text-hint text-[16px]">·</span>
                          <p className="text-orange-600 font-bold text-[16px]">预计{currentMeal.deliveryTime}送达</p>
                        </div>
                        <p className="text-text-hint text-[15px] mt-3 text-center line-clamp-2 px-4">{currentMeal.desc}</p>
                      </div>
                      <div className="h-[1px] bg-gray-100 my-4 shrink-0"></div>
                      <div className="shrink-0 flex gap-3">
                        <button onClick={handleChangeMeal} className="btn-secondary flex-1 h-[64px] text-[20px]">换一个</button>
                        <button onClick={handleOrder} className="btn-primary flex-1 h-[64px] text-[20px]">就吃这个</button>
                      </div>
                    </>
                  )}

                  {deliveryStatus === 'DELIVERING' && (
                    <>
                      <span className="text-text-sub text-[18px] shrink-0">✓ 已下单</span>
                      <div className="flex-1 flex flex-col py-4 min-h-0">
                        <div className="flex items-center gap-4 mb-4">
                          <img 
                            src={currentMeal.image} 
                            alt={currentMeal.name}
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 object-cover rounded-xl shadow-sm"
                          />
                          <div>
                            <p className="text-[18px] font-bold">{currentMeal.name}</p>
                            <p className="text-text-sub text-[14px]">{currentMeal.shop}</p>
                          </div>
                        </div>
                        <div className="h-[1px] bg-gray-100 mb-4"></div>
                        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                          <span className="text-[28px] font-bold text-text-main mt-2">预计 {estimatedTime} 到达</span>
                          
                          {/* Progress Bar */}
                          <div className="w-full h-2.5 bg-gray-100 rounded-full mt-6 relative overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: '66.6%' }}
                              transition={{ duration: 1.5, ease: "easeInOut" }}
                              className="absolute inset-y-0 left-0 bg-primary rounded-full"
                            />
                            {/* Segment Dividers */}
                            <div className="absolute inset-0 flex">
                              <div className="flex-1 border-r border-white/20 last:border-0" />
                              <div className="flex-1 border-r border-white/20 last:border-0" />
                              <div className="flex-1 border-r border-white/20 last:border-0" />
                              <div className="flex-1 border-r border-white/20 last:border-0" />
                            </div>
                          </div>
                          <div className="w-full flex justify-between text-[11px] text-text-hint mt-2">
                            <span>已下单</span>
                            <span>商家制作</span>
                            <span className="text-text-main font-bold">配送中</span>
                            <span>已送达</span>
                          </div>
                          
                          <p className="text-text-sub text-[16px] mt-8">注意听敲门声 🔔</p>
                        </div>
                      </div>
                      <button className="text-text-hint text-[14px] self-center mt-2 flex items-center gap-1 shrink-0">
                        有问题？ <ChevronRight size={14} />
                      </button>
                    </>
                  )}

                  {deliveryStatus === 'DELIVERED' && (
                    <>
                      <div className="flex flex-col items-center justify-center py-4">
                        <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center text-success mb-3">
                          <Check size={40} />
                        </div>
                        <h2 className="text-[22px] font-bold">今天午饭已送到</h2>
                        <p className="text-text-sub text-[14px] mt-1">{currentMeal.name} · {currentMeal.shop} · {deliveredTime} 送达</p>
                        
                        {/* Progress Bar (All Completed) */}
                        <div className="w-full h-2.5 bg-gray-100 rounded-full mt-6 relative overflow-hidden mx-4">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="absolute inset-y-0 left-0 bg-primary rounded-full"
                          />
                          {/* Segment Dividers */}
                          <div className="absolute inset-0 flex">
                            <div className="flex-1 border-r border-white/20 last:border-0" />
                            <div className="flex-1 border-r border-white/20 last:border-0" />
                            <div className="flex-1 border-r border-white/20 last:border-0" />
                            <div className="flex-1 border-r border-white/20 last:border-0" />
                          </div>
                        </div>
                        <div className="w-full flex justify-between text-[11px] text-text-hint mt-2 px-4">
                          <span>已下单</span>
                          <span>商家制作</span>
                          <span>配送中</span>
                          <span className="text-text-main font-bold">已送达</span>
                        </div>

                        <div className="w-full h-[1px] bg-gray-100 my-6"></div>
                        
                        {/* Rating Section */}
                        <div className="w-full px-2">
                          <div className="flex items-center gap-4 mb-4">
                            <img 
                              src={currentMeal.image} 
                              alt={currentMeal.name}
                              referrerPolicy="no-referrer"
                              className="w-16 h-16 object-cover rounded-xl shadow-sm grayscale-[0.2]"
                            />
                            <p className="text-[16px] font-bold text-text-main">您觉得今天的饭菜怎么样？</p>
                          </div>
                          <div className="flex gap-2">
                            {[
                              { label: '好吃', icon: '😋' },
                              { label: '一般', icon: '😐' },
                              { label: '不合胃口', icon: '☹️' }
                            ].map((rate) => (
                              <button 
                                key={rate.label}
                                className="flex-1 py-3 bg-bg-warm rounded-xl border border-gray-100 flex flex-col items-center gap-1 active:bg-gray-100 transition-colors"
                              >
                                <span className="text-[20px]">{rate.icon}</span>
                                <span className="text-[13px] font-bold text-text-sub">{rate.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Area 3: Bottom Interaction */}
              <div 
                className="bg-white border-t border-gray-100 p-6 safe-bottom flex flex-col items-center"
              >
                <button 
                  onClick={startVoice} 
                  className="w-full h-[120px] bg-primary rounded-[32px] flex flex-col items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-center">
                    <Phone size={56} className="text-text-main fill-current" />
                  </div>
                  <span className="text-text-main font-bold text-[24px]">
                    {deliveryStatus === 'DELIVERING' ? '电话客服' : '语音点餐'}
                  </span>
                </button>
                <p className="text-text-hint text-[14px] text-center mt-4">
                  {deliveryStatus === 'DELIVERING' ? '联系骑手或商家，解决配送问题' : '想吃什么，直接点这里跟我说'}
                </p>

                {/* Mobile Demo Status Switcher */}
                <div className="sm:hidden pointer-events-auto flex gap-1 bg-black/5 p-0.5 rounded-full scale-95 mt-4">
                  {(['RECOMMENDING', 'DELIVERING', 'DELIVERED'] as DeliveryStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        setDeliveryStatus(s);
                        stopSpeaking();
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors ${deliveryStatus === s ? 'bg-primary font-bold text-black' : 'bg-transparent text-black/40'}`}
                    >
                      {s === 'RECOMMENDING' ? '推荐' : s === 'DELIVERING' ? '配送' : '送达'}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* P-03: Full-screen Voice Interaction (iOS Inspired "Cold" Design) */}
          {appState === 'VOICE' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-mesh flex flex-col overflow-hidden"
            >
              {/* Area 1: Translucent Capsule Header */}
              <div className="absolute top-[48px] left-0 right-0 flex justify-center z-30">
                <div className="bg-white/40 backdrop-blur-md px-6 py-2.5 rounded-full flex items-center gap-3 border border-white/20 shadow-sm">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <span className="text-[18px] font-bold text-text-main">通话中</span>
                  <span className="text-[18px] font-mono font-bold text-text-main border-l border-black/10 pl-3">
                    {formatTime(voiceTimer)}
                  </span>
                </div>
              </div>

              {/* Area 2: Dynamic Content Area (Minimalist) */}
              <div className="flex-1 px-8 pt-[120px] pb-[240px] flex flex-col relative overflow-y-auto scrollbar-hide mask-fade-bottom">
                
                <div className="flex-1 flex flex-col justify-start pt-4">
                  <AnimatePresence mode="wait">
                    {isListening ? (
                      <motion.div
                        key="listening"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center z-10"
                      >
                        <div className="flex gap-3 mb-6">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              animate={{ 
                                scale: [1, 1.5, 1],
                                opacity: [0.3, 1, 0.3] 
                              }}
                              transition={{ 
                                repeat: Infinity, 
                                duration: 1.2, 
                                delay: i * 0.2,
                                ease: "easeInOut"
                              }}
                              className={`w-4 h-4 rounded-full bg-primary`}
                            />
                          ))}
                        </div>
                        <p className={`text-[24px] font-bold tracking-widest px-8 text-center leading-relaxed text-text-main`}>
                          {transcribedText || '正在听...'}
                          <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ repeat: Infinity, duration: 0.6 }}
                            className="inline-block w-1 h-6 bg-black/40 ml-1 align-middle"
                          />
                        </p>
                      </motion.div>
                    ) : voiceViewMode === 'CHAT' ? (
                      <motion.div 
                        key="chat"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <VoiceMessage 
                          isThinking={isThinking} 
                          isTyping={isTyping} 
                          displayedChatText={displayedChatText}
                          cursorClassName="w-1.5 h-10"
                        />
                      </motion.div>
                    ) : voiceStep === 'MEAL_SELECT' ? (
                      <motion.div 
                        key="meal_select"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <VoiceMessage 
                          isThinking={isThinking} 
                          isTyping={isTyping} 
                          displayedChatText={displayedChatText}
                        >
                          <motion.div 
                            initial="hidden"
                            animate="visible"
                            variants={{
                              hidden: { opacity: 0 },
                              visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.5 }
                              }
                            }}
                            className="flex flex-col"
                          >
                            {voiceMeals.map((meal, idx) => (
                              <motion.div 
                                key={meal.id} 
                                variants={{
                                  hidden: { opacity: 0 },
                                  visible: { opacity: 1, transition: { duration: 0.6 } }
                                }}
                                className="py-4 flex items-center gap-6 border-b border-black/5 last:border-0"
                              >
                                <div className="w-10 h-10 flex items-center justify-center font-black text-[28px] text-text-main/20 italic">
                                  {idx + 1}
                                </div>
                                <img 
                                  src={meal.image} 
                                  alt={meal.name}
                                  referrerPolicy="no-referrer"
                                  className="w-20 h-20 rounded-2xl object-cover grayscale-[0.2]"
                                />
                                <div className="flex-1">
                                  <p className="text-[24px] font-bold text-text-main leading-tight">{meal.name}</p>
                                  <p className="text-[18px] text-text-sub mt-1 font-medium">{meal.shop}</p>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        </VoiceMessage>
                      </motion.div>
                    ) : voiceStep === 'MEAT_SELECT' ? (
                      <motion.div 
                        key="meat_select"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <VoiceMessage 
                          isThinking={isThinking} 
                          isTyping={isTyping} 
                          displayedChatText={displayedChatText}
                        >
                          <motion.div 
                            initial="hidden"
                            animate="visible"
                            variants={{
                              hidden: { opacity: 0 },
                              visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.3 }
                              }
                            }}
                            className="flex flex-col"
                          >
                            {[
                              { id: 1, name: '猪肉小炒肉', emoji: '🐷' },
                              { id: 2, name: '牛肉小炒肉', emoji: '🐮' }
                            ].map((spec, idx) => (
                              <motion.div 
                                key={spec.id} 
                                variants={{
                                  hidden: { opacity: 0 },
                                  visible: { opacity: 1, transition: { duration: 0.4 } }
                                }}
                                className="py-5 flex items-center gap-6 border-b border-black/5 last:border-0"
                              >
                                <div className="w-10 h-10 flex items-center justify-center font-black text-[28px] text-text-main/20 italic">
                                  {idx + 1}
                                </div>
                                <span className="text-[40px] grayscale-[0.3]">{spec.emoji}</span>
                                <span className="text-[24px] font-bold text-text-main">{spec.name}</span>
                              </motion.div>
                            ))}
                          </motion.div>
                        </VoiceMessage>
                      </motion.div>
                    ) : voiceStep === 'SPEC_SELECT' ? (
                      <motion.div 
                        key="spec_select"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <VoiceMessage 
                          isThinking={isThinking} 
                          isTyping={isTyping} 
                          displayedChatText={displayedChatText}
                        >
                          <motion.div 
                            initial="hidden"
                            animate="visible"
                            variants={{
                              hidden: { opacity: 0 },
                              visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.3 }
                              }
                            }}
                            className="flex flex-col"
                          >
                            {[
                              { id: 1, name: '免辣', emoji: '🌿' },
                              { id: 2, name: '微辣', emoji: '🌶️' },
                              { id: 3, name: '中辣', emoji: '🌶️🌶️' }
                            ].map((spec, idx) => (
                              <motion.div 
                                key={spec.id} 
                                variants={{
                                  hidden: { opacity: 0 },
                                  visible: { opacity: 1, transition: { duration: 0.4 } }
                                }}
                                className="py-5 flex items-center gap-6 border-b border-black/5 last:border-0"
                              >
                                <div className="w-10 h-10 flex items-center justify-center font-black text-[28px] text-text-main/20 italic">
                                  {idx + 1}
                                </div>
                                <span className="text-[40px] grayscale-[0.3]">{spec.emoji}</span>
                                <span className="text-[24px] font-bold text-text-main">{spec.name}</span>
                              </motion.div>
                            ))}
                          </motion.div>
                        </VoiceMessage>
                      </motion.div>
                    ) : voiceStep === 'ADDRESS_CONFIRM' ? (
                      <motion.div 
                        key="address_confirm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <VoiceMessage 
                          isThinking={isThinking} 
                          isTyping={isTyping} 
                          displayedChatText={displayedChatText}
                        >
                          {!isListening && !isTransitioning && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.5 }}
                              className="mt-6 rounded-3xl overflow-hidden relative h-[160px]"
                            >
                              {/* Stage 1: Map Background */}
                              <img 
                                src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&q=80&w=600&h=400" 
                                alt="Map"
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 w-full h-full object-cover opacity-60"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/40 to-transparent" />
                              
                              {/* Stage 2: Text Content */}
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8, duration: 0.5 }}
                                className="absolute inset-0 p-6 flex flex-col justify-end"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                  <p className="text-text-sub text-[12px] font-bold tracking-wider uppercase opacity-60">确认送餐地址</p>
                                </div>
                                <p className="text-[22px] font-bold text-text-main leading-tight">
                                  {deliveryAddress}
                                </p>
                              </motion.div>
                            </motion.div>
                          )}
                        </VoiceMessage>
                      </motion.div>
                    ) : voiceStep === 'ORDER_PLACING' ? (
                      <motion.div 
                        key="order_placing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center"
                      >
                        <div className="relative w-48 h-48 flex items-center justify-center">
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="96" cy="96" r="80" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="4" />
                            <motion.circle
                              cx="96" cy="96" r="80" fill="none" stroke="#34C759" strokeWidth="6"
                              strokeDasharray="502.6"
                              initial={{ strokeDashoffset: 502.6 }}
                              animate={{ strokeDashoffset: 0 }}
                              transition={{ duration: 2, ease: "easeInOut" }}
                            />
                          </svg>
                          <motion.div
                            initial={{ scale: 0 }} 
                            animate={{ 
                              scale: [0, 1, 1, 0.8],
                              opacity: [0, 1, 1, 0]
                            }}
                            transition={{ 
                              times: [0, 0.1, 0.8, 1],
                              duration: 2.5,
                              ease: "easeInOut"
                            }}
                            className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                          >
                            <span className="text-[64px]">🛵</span>
                          </motion.div>
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 2, type: "spring", stiffness: 200, damping: 15 }}
                            className="absolute inset-0 flex items-center justify-center bg-[#34C759] rounded-full shadow-xl"
                          >
                            <Check size={96} className="text-white" strokeWidth={4} />
                          </motion.div>
                        </div>
                        <motion.p 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="mt-8 text-[28px] font-bold text-text-main"
                        >
                          正在下单...
                        </motion.p>
                      </motion.div>
                    ) : voiceStep === 'CS_MAIN' || voiceStep === 'CS_ADDRESS_INPUT' ? (
                      <motion.div 
                        key="cs_view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <VoiceMessage 
                          isThinking={isThinking} 
                          isTyping={isTyping} 
                          displayedChatText={displayedChatText}
                        >
                          {voiceStep === 'CS_ADDRESS_INPUT' && !isListening && !isTransitioning && !isThinking && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.5 }}
                              className="mt-6 rounded-3xl overflow-hidden relative h-[160px]"
                            >
                              {/* Stage 1: Map Background */}
                              <img 
                                src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&q=80&w=600&h=400" 
                                alt="Map"
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 w-full h-full object-cover opacity-60"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/40 to-transparent" />
                              
                              {/* Stage 2: Text Content */}
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8, duration: 0.5 }}
                                className="absolute inset-0 p-6 flex flex-col justify-end"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                  <p className="text-text-sub text-[12px] font-bold tracking-wider uppercase opacity-60">新送餐地址</p>
                                </div>
                                <p className="text-[22px] font-bold text-text-main leading-tight">
                                  {deliveryAddress}
                                </p>
                              </motion.div>
                            </motion.div>
                          )}
                        </VoiceMessage>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              {/* Area 3: iOS Inspired Operation Area */}
              <div className="absolute bottom-0 left-0 right-0 h-[calc(240px+env(safe-area-inset-bottom))] flex flex-col items-center justify-end pb-[calc(3rem+env(safe-area-inset-bottom))] z-40 pointer-events-none">
                {/* Curved Overlay Background */}
                <div 
                  className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] pointer-events-auto border-t border-white/50" 
                />
                
                <div className="flex flex-col gap-8 items-center w-full pointer-events-auto relative z-10">
                  {/* Row 1: 1, 2, 3 Buttons */}
                  <div className="flex justify-center gap-6">
                    {['1', '2', '3'].map((num) => (
                      <button 
                        key={num}
                        onClick={() => handleDial(num)}
                        className="w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-95"
                      >
                        <span className="text-[28px] font-bold text-black">{num}</span>
                      </button>
                    ))}
                  </div>

                  {/* Row 2: Hang Up Button */}
                  <div className="flex justify-center">
                    <button 
                      onClick={() => setAppState('MAIN')}
                      className="w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all bg-[#FF3B30] text-white shadow-[0_4px_12px_rgba(255,59,48,0.3)] active:scale-95"
                    >
                      <Phone size={28} className="fill-current rotate-[135deg]" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {/* P-04: Summary Page */}
          {appState === 'SUMMARY' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col px-6 safe-top safe-bottom bg-bg-warm"
            >
              <div className="mt-8">
                <span className="text-text-hint text-[12px]">刚才对话摘要</span>
                <div className="card mt-2">
                  <p className="text-[18px] font-bold text-text-main">{summaryText}</p>
                  <p className="text-text-sub text-[14px] mt-2">
                    {summaryText.includes('下单') ? '骑手将于13:05送到' : '您可以继续挑选喜欢的菜品'}
                  </p>
                </div>
              </div>
              
              <div className="mt-auto flex flex-col items-center">
                <p className="text-text-hint text-[14px] mb-4">3秒后自动返回主界面…</p>
                {/* Progress Bar */}
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mb-8">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, ease: 'linear' }}
                    className="h-full bg-primary"
                  />
                </div>
                <button onClick={() => setAppState('MAIN')} className="btn-primary h-[52px]">返回主界面</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
