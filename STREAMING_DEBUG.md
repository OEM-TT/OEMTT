# Streaming Debug Guide

## 🔍 **Added Debug Logs**

I've added comprehensive logging to track the streaming flow. Here's what to look for in the console:

### **1. When You Send a Question:**

```
🟣 Creating AI message placeholder with ID: ai-1738636800000
🤖 Asking question: with conversation history
🔗 API URL: http://localhost:3000/api/chat/ask
📝 Payload: {"unitId":"...","messages":[...]}
✅ Token found, making request...
```

### **2. When Backend Sends Data:**

```
📦 New data: event: context\ndata: {"unit":"...
🎯 Event: context
📝 Data for context: {"unit":...
📚 Calling onContext
```

### **3. When Tokens Arrive (THIS IS KEY!):**

```
🎯 Event: token
📝 Data for token: {"content":"The"}
🔤 Token received: The
🔤 Calling onToken callback
🔵 Token received: The ... length: 3
🟢 New content length: 3
🟡 Messages updated, AI message content length: 3
🟠 streamingContent updated, length: 3
🔴 Rendering AI message, content length: 3
```

### **4. When Complete:**

```
🎯 Event: complete
✅ Calling onComplete
✅ Stream complete, status: 200
```

## 🧪 **What to Check:**

### **Scenario 1: No tokens arriving at all**
If you see:
```
🟣 Creating AI message placeholder
🤖 Asking question
✅ Token found
```

But **NO** `🔤 Token received` logs:
- ❌ Backend is not sending tokens
- Check backend console for errors
- Check if backend streaming is working

### **Scenario 2: Tokens arriving but not updating UI**
If you see:
```
🔤 Token received: The
🔵 Token received: The
🟢 New content length: 3
🟡 Messages updated, AI message content length: 3
🟠 streamingContent updated, length: 3
```

But **NO** `🔴 Rendering AI message` logs:
- ❌ FlatList is not re-rendering
- React state update issue
- Check React DevTools

### **Scenario 3: Rendering but not visible**
If you see all logs including:
```
🔴 Rendering AI message, content length: 3
```

But don't see text on screen:
- ❌ UI/styling issue
- Check if text color matches background
- Check if message is off-screen
- Check Markdown component

## 📋 **Next Steps:**

1. **Send a test question** in the app
2. **Watch the console** (Metro bundler terminal or React Native debugger)
3. **Find which log is missing** from the sequence above
4. **Tell me which number/emoji** stops appearing

This will tell us exactly where the streaming is breaking down!

## 🎯 **Expected Log Flow:**

```
🟣 → 🤖 → ✅ → 📦 → 🎯 → 🔤 → 🔵 → 🟢 → 🟡 → 🟠 → 🔴 → ✅
```

If the flow stops at any emoji, that's where the problem is!
