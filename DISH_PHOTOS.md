# Dish photos

Photos show on the guest QR menu (96×80 box above the ADD button) and in
the admin menu list. A dish without a photo shows no box, so add photos
gradually; there's no need to do every dish at once.

## Adding one

Admin → **Menu** → ✎ on the dish → **Add photo** → pick any photo → **Save**.

The browser crops it to the menu's 6:5 shape and shrinks it to 480×400
WebP (about 30–60 KB) before uploading, so a 5 MB camera photo is fine.
Keep the dish in the middle of the frame because the edges get cropped.
Half and full portions can use the same photo.

## Storage (Vercel Blob)

Photos go to a **public** Vercel Blob store connected to the project.
Vercel adds `BLOB_READ_WRITE_TOKEN` automatically when the store is
connected. Until then the dish dialog shows "Photos turn on once Vercel
Blob storage is connected", and nothing else is affected.

Free (Hobby) plan math, at ~50 KB per photo:

| Limit | Free plan | Jamavat use |
|---|---|---|
| Storage | 1 GB | 100 dishes ≈ 5 MB |
| Data transfer | 10 GB / month | ≈ 200,000 photo views. Guests load lazily, and each photo URL is cached for a year |
| Uploads (advanced operations) | 2,000 / month | one per photo change |

Replacing or removing a photo deletes the old file, and deleting a dish
deletes its photo.

## Making the photos with ChatGPT

Real photos of your own food are always best. If you don't have them yet,
generate them with ChatGPT (or any image tool), one dish per image, then
upload them as above.

Start every prompt with this style line, so all photos look like one menu:

> Realistic food photograph, landscape 6:5 (1200×1000), dish centred with
> some space around it, 45° angle, served the way a Gujarati restaurant
> serves it in a steel plate or katori on a warm wooden table, soft natural
> daylight, shallow depth of field, appetising, no text, no hands, no
> logos, no cutlery clutter.

Then add the dish line:

| Dish | Prompt (after the style line) |
|---|---|
| સેવ ટમેટા (Sev Tameta) | A steel katori of Gujarati sev tameta nu shaak: tangy red tomato gravy with a generous heap of crunchy yellow gathiya sev on top, sprinkle of fresh coriander. |
| સૂકી ભાજી (Suki Bhaji) | A steel plate of dry Gujarati potato sabzi (suki bhaji): yellow turmeric potato cubes with mustard seeds, curry leaves, green chilli and coriander. |
| દાળ ભાત (Dal Bhaat) | A steel plate with a mound of steamed white rice and a katori of thin, sweet-sour Gujarati dal with a ghee tadka, coriander on top. |
| રોટલી (Rotli) | A stack of three thin soft Gujarati rotlis (phulka) with light brown spots, on a steel plate. |
| રોટલી ઘી (Rotli with ghee) | A stack of thin soft Gujarati rotlis glistening with melted ghee, a small spoon of ghee on the side. |
| ભાખરી (Bhakhri) | Two thick, crisp Gujarati bhakhris with a rustic patterned surface, on a steel plate. |
| ભાખરી ઘી (Bhakhri with ghee) | Two thick crisp Gujarati bhakhris with melted ghee on top, a small katori of ghee beside them. |
| છાસ (Chhaas) | A tall steel glass of Gujarati chhaas (spiced buttermilk), frothy on top, sprinkled with roasted cumin and chopped coriander. |
| ભૂંગળા (Bhungla) | A small steel plate of colourful fried bhungla (hollow papad tubes) in yellow, orange and green. |
| ફરાળી લાડવા (Farali Ladva) | Three round farali ladoos (fasting sweets made with rajgira, peanuts and jaggery) on a small steel plate. |

For a dish added later, write the dish line the same way: what it is, its
colour and texture, and what it's served in.
