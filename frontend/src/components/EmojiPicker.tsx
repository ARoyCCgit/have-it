"use client"

import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
}

interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  items: EmojiItem[];
}

const EMOJI_CATALOG: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: '😀',
    items: [
      { emoji: '😀', name: 'Grinning Face', keywords: ['smile', 'happy', 'grin', 'face', 'joy'] },
      { emoji: '😃', name: 'Grinning Face with Big Eyes', keywords: ['smile', 'happy', 'excited', 'joy'] },
      { emoji: '😄', name: 'Grinning Face with Smiling Eyes', keywords: ['smile', 'happy', 'laugh', 'haha'] },
      { emoji: '😁', name: 'Beaming Face', keywords: ['smile', 'happy', 'teeth', 'grin'] },
      { emoji: '😆', name: 'Grinning Squinting Face', keywords: ['laugh', 'haha', 'lol', 'rofl', 'funny'] },
      { emoji: '😅', name: 'Sweat Grin Face', keywords: ['sweat', 'relief', 'nervous', 'laugh'] },
      { emoji: '🤣', name: 'Rolling on Floor Laughing', keywords: ['rofl', 'lol', 'laugh', 'haha', 'funny', 'dying'] },
      { emoji: '😂', name: 'Tears of Joy', keywords: ['laugh', 'lol', 'tears', 'crying', 'funny', 'haha'] },
      { emoji: '🙂', name: 'Slightly Smiling Face', keywords: ['smile', 'fine', 'happy', 'okay'] },
      { emoji: '🙃', name: 'Upside-Down Face', keywords: ['sarcasm', 'irony', 'crazy', 'silly'] },
      { emoji: '😉', name: 'Winking Face', keywords: ['wink', 'flirt', 'playful', 'joke'] },
      { emoji: '😊', name: 'Smiling Face with Smiling Eyes', keywords: ['blush', 'happy', 'sweet', 'smile', 'warm'] },
      { emoji: '😇', name: 'Smiling Face with Halo', keywords: ['angel', 'innocent', 'halo', 'good'] },
      { emoji: '🥰', name: 'Smiling Face with Hearts', keywords: ['love', 'adore', 'crush', 'hearts', 'affection'] },
      { emoji: '😍', name: 'Heart Eyes', keywords: ['love', 'crush', 'heart', 'eyes', 'beautiful'] },
      { emoji: '🤩', name: 'Star-Struck', keywords: ['star', 'eyes', 'wow', 'amazed', 'excited'] },
      { emoji: '😘', name: 'Face Blowing a Kiss', keywords: ['kiss', 'love', 'flirt', 'heart'] },
      { emoji: '😗', name: 'Kissing Face', keywords: ['kiss', 'whistle', 'love'] },
      { emoji: '😚', name: 'Kissing Face Closed Eyes', keywords: ['kiss', 'love', 'sweet'] },
      { emoji: '😋', name: 'Face Savoring Food', keywords: ['yum', 'delicious', 'yummy', 'tasty', 'food', 'tongue'] },
      { emoji: '😛', name: 'Face with Tongue', keywords: ['tongue', 'playful', 'silly', 'joke'] },
      { emoji: '😜', name: 'Winking Face with Tongue', keywords: ['wink', 'tongue', 'crazy', 'party', 'prank'] },
      { emoji: '🤪', name: 'Zany Face', keywords: ['crazy', 'wild', 'goofy', 'silly', 'party'] },
      { emoji: '😝', name: 'Squinting Face with Tongue', keywords: ['tongue', 'playful', 'laugh', 'fun'] },
      { emoji: '🤑', name: 'Money-Mouth Face', keywords: ['money', 'rich', 'cash', 'dollar', 'payday'] },
      { emoji: '🤗', name: 'Hugging Face', keywords: ['hug', 'embrace', 'welcome', 'warm'] },
      { emoji: '🤭', name: 'Face with Hand Over Mouth', keywords: ['giggle', 'oops', 'secret', 'shy', 'laugh'] },
      { emoji: '🤫', name: 'Shushing Face', keywords: ['shh', 'quiet', 'secret', 'silent', 'hush'] },
      { emoji: '🤔', name: 'Thinking Face', keywords: ['think', 'ponder', 'hmmm', 'wonder', 'curious'] },
      { emoji: '🤐', name: 'Zipper-Mouth Face', keywords: ['zip', 'secret', 'silent', 'mute', 'quiet'] },
      { emoji: '🤨', name: 'Raised Eyebrow', keywords: ['skeptical', 'doubt', 'suspicious', 'sus', 'eyebrow'] },
      { emoji: '😐', name: 'Neutral Face', keywords: ['neutral', 'meh', 'blank', 'okay'] },
      { emoji: '😑', name: 'Expressionless Face', keywords: ['unimpressed', 'meh', 'blank', 'deadpan'] },
      { emoji: '😶', name: 'Face Without Mouth', keywords: ['mute', 'speechless', 'silence', 'quiet'] },
      { emoji: '😏', name: 'Smirking Face', keywords: ['smirk', 'flirt', 'cocky', 'sly'] },
      { emoji: '😒', name: 'Unamused Face', keywords: ['bored', 'unimpressed', 'annoyed', 'side-eye'] },
      { emoji: '🙄', name: 'Face with Rolling Eyes', keywords: ['eye roll', 'whatever', 'annoyed', 'sarcastic'] },
      { emoji: '😬', name: 'Grimacing Face', keywords: ['grimace', 'awkward', 'yikes', 'cringe', 'nervous'] },
      { emoji: '🤥', name: 'Lying Face', keywords: ['lie', 'liar', 'pinocchio', 'fake', 'nose'] },
      { emoji: '😌', name: 'Relieved Face', keywords: ['relieved', 'peace', 'calm', 'zen', 'content'] },
      { emoji: '😔', name: 'Pensive Face', keywords: ['sad', 'down', 'sorry', 'depressed', 'lonely'] },
      { emoji: '😪', name: 'Sleepy Face', keywords: ['sleep', 'tired', 'snooze', 'rest'] },
      { emoji: '🤤', name: 'Drooling Face', keywords: ['drool', 'hungry', 'delicious', 'crave'] },
      { emoji: '😴', name: 'Sleeping Face', keywords: ['sleep', 'zz', 'tired', 'bed', 'night'] },
      { emoji: '😷', name: 'Mask Face', keywords: ['mask', 'sick', 'covid', 'doctor', 'virus'] },
      { emoji: '🤒', name: 'Thermometer Face', keywords: ['fever', 'sick', 'ill', 'temperature'] },
      { emoji: '🤕', name: 'Head-Bandage Face', keywords: ['hurt', 'injured', 'ouch', 'pain', 'bandage'] },
      { emoji: '🤢', name: 'Nauseated Face', keywords: ['nausea', 'sick', 'gross', 'disgust', 'puke'] },
      { emoji: '🤮', name: 'Vomiting Face', keywords: ['vomit', 'puke', 'barf', 'sick', 'disgust'] },
      { emoji: '🤧', name: 'Sneezing Face', keywords: ['sneeze', 'tissue', 'cold', 'allergy', 'sick'] },
      { emoji: '🥵', name: 'Hot Face', keywords: ['hot', 'sweat', 'heat', 'spicy', 'fever'] },
      { emoji: '🥶', name: 'Cold Face', keywords: ['cold', 'freezing', 'ice', 'frost', 'shiver'] },
      { emoji: '🥴', name: 'Woozy Face', keywords: ['drunk', 'tipsy', 'dizzy', 'confused', 'wasted'] },
      { emoji: '😵', name: 'Dizzy Face', keywords: ['dizzy', 'knocked out', 'faint', 'dead'] },
      { emoji: '🤯', name: 'Exploding Head', keywords: ['mind blown', 'boom', 'shocked', 'crazy', 'wow'] },
      { emoji: '🤠', name: 'Cowboy Face', keywords: ['cowboy', 'western', 'howdy', 'hat'] },
      { emoji: '🥳', name: 'Partying Face', keywords: ['party', 'celebrate', 'birthday', 'yay', 'fun'] },
      { emoji: '😎', name: 'Sunglasses Cool Face', keywords: ['cool', 'sunglasses', 'awesome', 'boss', 'chill'] },
      { emoji: '🤓', name: 'Nerd Face', keywords: ['nerd', 'geek', 'glasses', 'smart', 'study'] },
      { emoji: '🧐', name: 'Monocle Face', keywords: ['monocle', 'investigate', 'curious', 'inspect'] },
      { emoji: '🥺', name: 'Pleading Face', keywords: ['plead', 'puppy eyes', 'beg', 'please', 'cute'] },
      { emoji: '😭', name: 'Loudly Crying Face', keywords: ['cry', 'sad', 'tears', 'bawling', 'sob', 'weep'] },
      { emoji: '😤', name: 'Triumph Steam Face', keywords: ['triumph', 'angry', 'huff', 'proud', 'rage'] },
      { emoji: '😡', name: 'Pouting Angry Face', keywords: ['angry', 'mad', 'red', 'furious', 'rage'] },
      { emoji: '🤬', name: 'Swearing Cursing Face', keywords: ['curse', 'swear', 'profanity', 'furious', 'angry'] },
      { emoji: '💀', name: 'Skull', keywords: ['dead', 'death', 'skeleton', 'dying', 'skull'] },
      { emoji: '💩', name: 'Poop Pile', keywords: ['poop', 'poo', 'crap', 'funny'] },
      { emoji: '🤡', name: 'Clown', keywords: ['clown', 'fool', 'joke', 'circus'] },
      { emoji: '👻', name: 'Ghost', keywords: ['ghost', 'spooky', 'halloween', 'boo'] },
      { emoji: '🤖', name: 'Robot', keywords: ['robot', 'bot', 'machine', 'ai'] },
    ],
  },
  {
    id: 'gestures',
    name: 'Gestures & Hands',
    icon: '👍',
    items: [
      { emoji: '👍', name: 'Thumbs Up', keywords: ['like', 'thumbs up', 'yes', 'agree', 'approve', 'good', 'ok'] },
      { emoji: '👎', name: 'Thumbs Down', keywords: ['dislike', 'thumbs down', 'no', 'disapprove', 'bad'] },
      { emoji: '👊', name: 'Fist Bump', keywords: ['fist', 'punch', 'bump', 'bro', 'fight'] },
      { emoji: '✊', name: 'Raised Fist', keywords: ['fist', 'power', 'solidarity', 'strength'] },
      { emoji: '🤛', name: 'Left Fist', keywords: ['fist bump', 'bro', 'punch'] },
      { emoji: '🤜', name: 'Right Fist', keywords: ['fist bump', 'bro', 'punch'] },
      { emoji: '🤞', name: 'Crossed Fingers', keywords: ['fingers crossed', 'luck', 'hope', 'wish'] },
      { emoji: '✌️', name: 'Victory Peace Hand', keywords: ['peace', 'victory', 'two', 'v'] },
      { emoji: '🤟', name: 'Love-You Sign', keywords: ['love', 'ily', 'hand', 'sign'] },
      { emoji: '🤘', name: 'Rock On Horns', keywords: ['rock', 'metal', 'horns', 'party'] },
      { emoji: '👌', name: 'OK Hand', keywords: ['ok', 'perfect', 'fine', 'agree', 'nice'] },
      { emoji: '🤏', name: 'Pinching Hand', keywords: ['pinch', 'little', 'small', 'tiny'] },
      { emoji: '👈', name: 'Point Left', keywords: ['point', 'left', 'direction'] },
      { emoji: '👉', name: 'Point Right', keywords: ['point', 'right', 'direction'] },
      { emoji: '👆', name: 'Point Up', keywords: ['point', 'up', 'direction'] },
      { emoji: '👇', name: 'Point Down', keywords: ['point', 'down', 'direction'] },
      { emoji: '☝️', name: 'Index Pointing Up', keywords: ['point', 'up', 'one', 'first'] },
      { emoji: '✋', name: 'Raised Hand', keywords: ['hand', 'stop', 'high five', 'palm'] },
      { emoji: '🤚', name: 'Raised Back of Hand', keywords: ['hand', 'backhand'] },
      { emoji: '🖐️', name: 'Hand Splayed', keywords: ['hand', 'five', 'fingers'] },
      { emoji: '🖖', name: 'Vulcan Salute', keywords: ['spock', 'vulcan', 'peace'] },
      { emoji: '👋', name: 'Waving Hand', keywords: ['wave', 'hello', 'hi', 'bye', 'goodbye'] },
      { emoji: '🤙', name: 'Call Me Hand', keywords: ['call', 'shaka', 'hang loose', 'phone'] },
      { emoji: '💪', name: 'Flexed Biceps', keywords: ['muscle', 'strong', 'power', 'gym', 'bicep', 'flex'] },
      { emoji: '🦾', name: 'Mechanical Arm', keywords: ['robot', 'arm', 'strong', 'prosthetic'] },
      { emoji: '🖕', name: 'Middle Finger', keywords: ['middle finger', 'rude', 'flip'] },
      { emoji: '✍️', name: 'Writing Hand', keywords: ['write', 'letter', 'notes', 'pen'] },
      { emoji: '🙏', name: 'Folded Hands Pray', keywords: ['pray', 'please', 'thank you', 'thanks', 'namaste', 'hope', 'bless'] },
      { emoji: '🤝', name: 'Handshake', keywords: ['handshake', 'deal', 'agreement', 'shake', 'partner'] },
      { emoji: '👏', name: 'Clapping Hands', keywords: ['clap', 'bravo', 'applause', 'yay', 'hands'] },
      { emoji: '🙌', name: 'Raising Hands', keywords: ['celebrate', 'praise', 'yay', 'hooray', 'hands'] },
      { emoji: '👐', name: 'Open Hands', keywords: ['open', 'hands', 'hug', 'care'] },
      { emoji: '🤲', name: 'Palms Together', keywords: ['prayer', 'dua', 'cupped', 'beg'] },
      { emoji: '💅', name: 'Nail Polish', keywords: ['nails', 'beauty', 'slay', 'diva'] },
      { emoji: '🤳', name: 'Selfie', keywords: ['selfie', 'camera', 'phone', 'photo'] },
      { emoji: '👀', name: 'Eyes', keywords: ['eyes', 'look', 'see', 'peeking', 'watch'] },
      { emoji: '🧠', name: 'Brain', keywords: ['brain', 'smart', 'mind', 'idea', 'think'] },
      { emoji: '🫂', name: 'Hugging People', keywords: ['hug', 'embrace', 'comfort', 'friends'] },
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts & Love',
    icon: '❤️',
    items: [
      { emoji: '❤️', name: 'Red Heart', keywords: ['heart', 'love', 'red', 'romance', 'like'] },
      { emoji: '🧡', name: 'Orange Heart', keywords: ['heart', 'orange', 'love'] },
      { emoji: '💛', name: 'Yellow Heart', keywords: ['heart', 'yellow', 'friendship', 'love'] },
      { emoji: '💚', name: 'Green Heart', keywords: ['heart', 'green', 'nature', 'love'] },
      { emoji: '💙', name: 'Blue Heart', keywords: ['heart', 'blue', 'trust', 'love'] },
      { emoji: '💜', name: 'Purple Heart', keywords: ['heart', 'purple', 'bts', 'love'] },
      { emoji: '🖤', name: 'Black Heart', keywords: ['heart', 'black', 'dark', 'goth'] },
      { emoji: '🤍', name: 'White Heart', keywords: ['heart', 'white', 'pure'] },
      { emoji: '🤎', name: 'Brown Heart', keywords: ['heart', 'brown'] },
      { emoji: '💔', name: 'Broken Heart', keywords: ['broken', 'heart', 'heartbreak', 'sad', 'dumped'] },
      { emoji: '❣️', name: 'Heart Exclamation', keywords: ['heart', 'exclamation', 'love'] },
      { emoji: '💕', name: 'Two Hearts', keywords: ['hearts', 'love', 'floating', 'cute'] },
      { emoji: '💞', name: 'Revolving Hearts', keywords: ['hearts', 'love', 'spin'] },
      { emoji: '💓', name: 'Beating Heart', keywords: ['heart', 'beat', 'pulse', 'love'] },
      { emoji: '💗', name: 'Growing Heart', keywords: ['heart', 'love', 'cute', 'pink'] },
      { emoji: '💖', name: 'Sparkling Heart', keywords: ['heart', 'sparkle', 'shine', 'love'] },
      { emoji: '💘', name: 'Heart with Arrow', keywords: ['cupid', 'arrow', 'love', 'struck'] },
      { emoji: '💝', name: 'Heart with Ribbon', keywords: ['gift', 'heart', 'ribbon', 'present', 'love'] },
      { emoji: '💟', name: 'Heart Decoration', keywords: ['heart', 'decoration', 'badge'] },
      { emoji: '💌', name: 'Love Letter', keywords: ['letter', 'envelope', 'mail', 'love', 'heart'] },
      { emoji: '💋', name: 'Kiss Mark', keywords: ['kiss', 'lips', 'lipstick', 'smooch'] },
      { emoji: '💯', name: 'Hundred Points', keywords: ['100', 'hundred', 'perfect', 'score', 'lit'] },
      { emoji: '🔥', name: 'Fire', keywords: ['fire', 'flame', 'hot', 'lit', 'burn', 'trend'] },
      { emoji: '✨', name: 'Sparkles', keywords: ['sparkle', 'magic', 'stars', 'clean', 'shine', 'glitter'] },
      { emoji: '⭐', name: 'Star', keywords: ['star', 'yellow', 'favorite', 'gold'] },
      { emoji: '🌟', name: 'Glowing Star', keywords: ['star', 'glow', 'shine', 'bright'] },
      { emoji: '💥', name: 'Boom Explosion', keywords: ['boom', 'bang', 'crash', 'explode', 'collision'] },
      { emoji: '💢', name: 'Anger Symbol', keywords: ['anger', 'mad', 'anime', 'vein'] },
      { emoji: '💫', name: 'Dizzy Star', keywords: ['star', 'dizzy', 'sparkle', 'magic'] },
    ],
  },
  {
    id: 'fun_food',
    name: 'Food, Fun & Objects',
    icon: '🎉',
    items: [
      { emoji: '🎉', name: 'Party Popper', keywords: ['party', 'popper', 'celebrate', 'congrats', 'birthday', 'tada'] },
      { emoji: '🎊', name: 'Confetti Ball', keywords: ['confetti', 'party', 'celebrate'] },
      { emoji: '🎈', name: 'Balloon', keywords: ['balloon', 'birthday', 'party', 'celebration'] },
      { emoji: '🎁', name: 'Wrapped Gift', keywords: ['gift', 'present', 'birthday', 'box', 'ribbon'] },
      { emoji: '🏆', name: 'Trophy', keywords: ['trophy', 'winner', 'champion', 'first', 'gold'] },
      { emoji: '🥇', name: 'Gold Medal', keywords: ['gold', 'medal', 'first', 'winner', '1st'] },
      { emoji: '🥈', name: 'Silver Medal', keywords: ['silver', 'medal', 'second', '2nd'] },
      { emoji: '🥉', name: 'Bronze Medal', keywords: ['bronze', 'medal', 'third', '3rd'] },
      { emoji: '⚽', name: 'Soccer Football', keywords: ['soccer', 'football', 'ball', 'sport', 'game'] },
      { emoji: '🏀', name: 'Basketball', keywords: ['basketball', 'hoop', 'ball', 'sport', 'nba'] },
      { emoji: '🏈', name: 'American Football', keywords: ['football', 'nfl', 'sport'] },
      { emoji: '⚾', name: 'Baseball', keywords: ['baseball', 'ball', 'sport'] },
      { emoji: '🎾', name: 'Tennis', keywords: ['tennis', 'racket', 'sport', 'ball'] },
      { emoji: '🎮', name: 'Video Game', keywords: ['game', 'gaming', 'controller', 'playstation', 'xbox'] },
      { emoji: '🎯', name: 'Bullseye Target', keywords: ['target', 'dart', 'bullseye', 'goal', 'hit'] },
      { emoji: '🎲', name: 'Game Die', keywords: ['dice', 'game', 'gamble', 'roll'] },
      { emoji: '🎨', name: 'Artist Palette', keywords: ['art', 'paint', 'draw', 'color', 'creative'] },
      { emoji: '🎬', name: 'Clapper Board', keywords: ['movie', 'cinema', 'film', 'action', 'director'] },
      { emoji: '🎤', name: 'Microphone', keywords: ['mic', 'sing', 'karaoke', 'music', 'voice'] },
      { emoji: '🎧', name: 'Headphones', keywords: ['music', 'listen', 'audio', 'headphones'] },
      { emoji: '🚀', name: 'Rocket', keywords: ['rocket', 'space', 'launch', 'fast', 'moon'] },
      { emoji: '🚗', name: 'Car Automobile', keywords: ['car', 'vehicle', 'drive', 'road'] },
      { emoji: '✈️', name: 'Airplane', keywords: ['plane', 'flight', 'fly', 'travel', 'vacation'] },
      { emoji: '🏝️', name: 'Desert Island', keywords: ['island', 'beach', 'vacation', 'palm tree', 'tropical'] },
      { emoji: '☕', name: 'Hot Coffee', keywords: ['coffee', 'tea', 'hot', 'morning', 'cafe'] },
      { emoji: '🍕', name: 'Pizza', keywords: ['pizza', 'food', 'cheese', 'slice', 'pepperoni'] },
      { emoji: '🍔', name: 'Hamburger', keywords: ['burger', 'fast food', 'meat', 'food'] },
      { emoji: '🍟', name: 'French Fries', keywords: ['fries', 'chips', 'fast food', 'food'] },
      { emoji: '🌮', name: 'Taco', keywords: ['taco', 'mexican', 'food'] },
      { emoji: '🍣', name: 'Sushi', keywords: ['sushi', 'japanese', 'fish', 'food'] },
      { emoji: '🍦', name: 'Soft Ice Cream', keywords: ['ice cream', 'dessert', 'sweet', 'cone'] },
      { emoji: '🍰', name: 'Cake Slice', keywords: ['cake', 'dessert', 'sweet', 'birthday'] },
      { emoji: '🍻', name: 'Beer Mugs Clinking', keywords: ['beer', 'cheers', 'drink', 'party', 'bar'] },
      { emoji: '🍺', name: 'Beer Mug', keywords: ['beer', 'drink', 'pub', 'bar'] },
      { emoji: '🥂', name: 'Clinking Champagne', keywords: ['champagne', 'cheers', 'toast', 'celebrate'] },
      { emoji: '🍾', name: 'Champagne Bottle', keywords: ['champagne', 'popping', 'wine', 'celebrate'] },
      { emoji: '🍹', name: 'Tropical Drink', keywords: ['cocktail', 'drink', 'juice', 'tropical'] },
      { emoji: '🍩', name: 'Donut', keywords: ['donut', 'doughnut', 'sweet', 'dessert'] },
      { emoji: '🍪', name: 'Cookie', keywords: ['cookie', 'biscuit', 'sweet', 'chocolate'] },
      { emoji: '🍫', name: 'Chocolate Bar', keywords: ['chocolate', 'candy', 'sweet'] },
      { emoji: '🍿', name: 'Popcorn', keywords: ['popcorn', 'movie', 'snack', 'cinema'] },
      { emoji: '🐶', name: 'Dog Face', keywords: ['dog', 'puppy', 'pet', 'bark', 'animal'] },
      { emoji: '🐱', name: 'Cat Face', keywords: ['cat', 'kitten', 'pet', 'meow', 'animal'] },
      { emoji: '🦁', name: 'Lion', keywords: ['lion', 'king', 'wild', 'animal'] },
      { emoji: '🐼', name: 'Panda', keywords: ['panda', 'bear', 'cute', 'animal'] },
      { emoji: '🐵', name: 'Monkey Face', keywords: ['monkey', 'ape', 'animal'] },
      { emoji: '🌞', name: 'Sun Face', keywords: ['sun', 'sunny', 'morning', 'summer', 'bright'] },
      { emoji: '🌙', name: 'Crescent Moon', keywords: ['moon', 'night', 'sleep', 'dark'] },
      { emoji: '⚡', name: 'High Voltage Lightning', keywords: ['lightning', 'bolt', 'power', 'thunder', 'fast'] },
      { emoji: '🌈', name: 'Rainbow', keywords: ['rainbow', 'colors', 'nature', 'pride'] },
      { emoji: '💸', name: 'Money with Wings', keywords: ['money', 'cash', 'flying', 'spend', 'dollar'] },
      { emoji: '💰', name: 'Money Bag', keywords: ['money', 'bag', 'rich', 'dollar', 'wealth'] },
      { emoji: '💎', name: 'Diamond Gem', keywords: ['diamond', 'gem', 'jewel', 'rich', 'crystal'] },
    ],
  },
];

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose }) => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');

  const allItems = useMemo(() => {
    return EMOJI_CATALOG.flatMap((cat) => cat.items);
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return EMOJI_CATALOG[activeCategory]?.items || [];
    }
    return allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(query)) ||
        item.emoji.includes(query)
    );
  }, [search, activeCategory, allItems]);

  return (
    <div className="w-full sm:w-[360px] bg-[#202c33] border border-gray-700/90 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 select-none animate-in fade-in zoom-in-95 duration-150">
      {/* Search Header */}
      <div className="p-2.5 border-b border-gray-700/60 bg-[#111b21] flex items-center gap-2">
        <div className="relative flex items-center flex-1">
          <Search className="absolute left-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search emoji (e.g. smile, heart, fire)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8.5 pr-8 py-2 sm:py-1.5 bg-[#202c33] text-white text-sm sm:text-xs rounded-xl border border-gray-700 focus:outline-none focus:border-[#03cafc] placeholder-gray-400 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700/60 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/60 rounded-xl transition-colors cursor-pointer flex-shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Category Tabs (visible when not searching) */}
      {!search.trim() && (
        <div className="flex border-b border-gray-700/60 bg-[#111b21]/70 px-1 py-1 gap-1">
          {EMOJI_CATALOG.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(idx)}
              className={`flex-1 py-1.5 text-sm rounded-lg transition-colors text-center cursor-pointer ${
                activeCategory === idx
                  ? 'bg-[#03cafc]/20 text-[#03cafc] font-semibold border border-[#03cafc]/30 shadow-sm'
                  : 'text-gray-400 hover:bg-gray-700/40 hover:text-gray-200'
              }`}
              title={cat.name}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="p-2.5 max-h-56 overflow-y-auto custom-scroll">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            <p className="text-xl mb-1">🔍</p>
            No emojis found for &quot;{search}&quot;
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {filteredItems.map((item, idx) => (
              <button
                key={`${item.emoji}-${idx}`}
                type="button"
                onClick={() => onSelectEmoji(item.emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-700/70 rounded-lg transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                title={item.name}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmojiPicker;
