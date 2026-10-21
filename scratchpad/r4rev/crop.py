from PIL import Image
R='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/review-ui-icons-r4/'
im=Image.open('/home/user/Ninja-Fantasy-Game/docs/reference/icons-owner-reference-1.jpg').convert('RGB')
# corner zoom of slot 1
im.crop((10,252,70,312)).resize((480,480),Image.NEAREST).save(R+'his-slot1-tl-x8.png')
im.crop((200,450,260,510)).resize((480,480),Image.NEAREST).save(R+'his-slot1-br-x8.png')
im.crop((10,252,260,505)).resize((750,759),Image.NEAREST).save(R+'his-slot1-x3.png')
