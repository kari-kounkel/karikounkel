import "@fontsource/great-vibes/latin-400.css";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-700.css";
import "@fontsource/nunito-sans/latin-800.css";
import "../tree/tree.css";
import "../sales.css";
import "./legal.css";

export const metadata = { title: "Terms, privacy and refunds · Christmas Together" };

/**
 * DRAFT FOR OWNER AND LEGAL REVIEW. Plain-language terms that describe what the product actually does.
 * Items marked REVIEW in comments need the owner's confirmation before public launch.
 */
export default function Legal() {
  return (
    <div className="pt sell legal">
      <main>
        <p className="script brand2">Christmas Together</p>
        <h1>Terms, privacy and refunds</h1>
        <p className="muted">Last updated November 23, 2026</p>
        <nav aria-label="On this page">
          <a href="#terms">Terms</a><a href="#refunds">Refunds</a><a href="#privacy">Privacy</a><a href="#retention">Keeping and deleting</a>
          <a href="#gifts">Gifts and stores</a><a href="#meet">Google Meet</a><a href="#affiliate">Affiliate disclosure</a><a href="#contact">Contact</a>
        </nav>

        <section id="terms">
          <h2>Terms of service</h2>
          {/* REVIEW: confirm the legal business name and state. */}
          <p>Christmas Together is part of Party Together, operated by K Co LLC (&ldquo;we&rdquo;). By buying or joining a party you agree to these terms.</p>
          <p><b>What you get.</b> One purchase creates one private party for up to 25 people, the host included. The party stays available until 30 days after its date.</p>
          <p><b>Invitations are keys.</b> Each guest gets a personal link. Whoever has a link can act as that guest, so share each link only with the person it is for. Hosts are responsible for who they invite.</p>
          <p><b>Your content.</b> You keep ownership of what you write and upload. You give us permission to store it and show it to the people at your party, and to no one else. Do not upload anything unlawful, harassing, or that you have no right to share.</p>
          <p><b>Messages.</b> If you give us an email address or mobile number for a guest, we send that person their invitation on your behalf. Add only people who expect to hear from you. Message and data rates may apply to texts.</p>
          <p><b>Fair use.</b> Do not try to break into other parties, overload the service, or use it to send unwanted messages. We may suspend a party that does.</p>
          <p><b>No guarantees we cannot keep.</b> We work hard to keep the service running, but we provide it as is. We cannot promise it will be uninterrupted or error free, and we are not responsible for your video call, your internet connection, or other companies&rsquo; services. To the extent the law allows, our liability is limited to what you paid for your party.</p>
          <p><b>Changes.</b> If we change these terms in a way that matters, we will say so on this page.</p>
        </section>

        <section id="refunds">
          <h2>Refund policy</h2>
          <p>You can have a full refund within 14 days of purchase, as long as the presents at your party have not been opened. After the presents are opened, the party has been delivered and is not refundable. If something went wrong on our side, tell us and we will make it right.</p>
          <p>When a party is refunded it is cancelled: nothing more can be added or changed, and everyone can still read and save what is there for 7 days. Then it is deleted.</p>
          <p>A refund covers the price of the party only. Gifts that guests bought from stores are between them and the store.</p>
          <p>To ask for a refund, use the support form on the <a href="/christmas">main page</a>.</p>
        </section>

        <section id="privacy">
          <h2>Privacy policy</h2>
          <p><b>What we collect.</b> The buyer&rsquo;s name and email from checkout. Each guest&rsquo;s name, and an email address or mobile number if one is provided. What people put in presents: messages, photos, links, promises, wrapping choices. Thank-you notes and reactions. Date votes. Basic technical records needed to run the service, such as error logs and rate limits.</p>
          <p><b>What we do not collect.</b> We never see or store card numbers; payments are handled by Stripe. We do not sell personal information. We do not use what is in your presents for advertising.</p>
          <p><b>Who can see what.</b> What is inside a wrapped present is visible only to the person who made it until the host opens the presents; after that, to the giver and the recipient. Thank-you notes are private to those two people. A guest&rsquo;s email and mobile number are visible only to that guest, the host, and the person who added them. Everyone at a party can see the guest list by name and who can make which date.</p>
          <p><b>How it is protected.</b> Party data is reachable only through our server, which checks every request. Photos are kept in private storage and shown through short-lived links. Invitation links are stored encrypted.</p>
          <p><b>Companies that help us run the service.</b> Stripe (payments), Supabase (database and photo storage), Vercel (hosting), SendGrid (email) and Twilio (text messages). They process data on our behalf.</p>
          <p><b>Children.</b> A parent or guardian should set up and supervise participation by anyone under 13.</p>
          <p><b>Your choices.</b> You can change or delete your own presents until they are opened, and remove your email at any time. To have your information removed sooner than the normal schedule, contact us.</p>
        </section>

        <section id="retention">
          <h2>Keeping and deleting your party</h2>
          <p>Your party stays available for 30 days after its date so people can go back to it. We email a reminder 7 days and 1 day before deletion to everyone who gave us an email address.</p>
          <p>After that the party and everything in it, including messages, photos and thank-yous, is permanently deleted from our live systems. Copies may remain in encrypted backups for a short time (currently up to 7 days) before those are overwritten too. Deleted parties cannot be recovered.</p>
          <p>We keep a record of the purchase itself (date, amount, buyer email) for accounting.</p>
          <p><b>Things on other services.</b> Videos, songs and products you link to stay on YouTube, Spotify, Amazon or wherever they live, under those companies&rsquo; own privacy and retention rules. Deleting your party does not delete them. An Unlisted YouTube video can be watched by anyone who has its link.</p>
        </section>

        <section id="gifts">
          <h2>Gifts and stores</h2>
          <p>Guests may link to a gift they bought from a store. Those stores, not us, handle checkout, shipping, returns and whether a product is available. We do not verify that a linked gift was actually purchased or delivered.</p>
          <p>Please do not paste gift card numbers or PINs into a present. Have the store deliver the gift card to the recipient directly, and link the order.</p>
        </section>

        <section id="meet">
          <h2>Google Meet</h2>
          <p>You host the video call in your own Google account and paste its link into your party. We do not create, host, record or join your call. How long a meeting can run and how many people can join depend on your Google account. Google Meet is a trademark of Google LLC; we are not affiliated with Google.</p>
        </section>

        <section id="affiliate">
          <h2>Affiliate disclosure</h2>
          <p>Some links to products may be affiliate links. As an Amazon Associate we earn from qualifying purchases. This does not change the price you pay.</p>
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p>Use the support form on the <a href="/christmas">main page</a> and a real person will write back.</p>
        </section>
      </main>
    </div>
  );
}
