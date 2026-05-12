import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveImage } from './utils/adminHelpers';

const AdminModeration = ({ allReviews, setConfirmReviewDelete }) => (
  <div className="bg-white rounded-[2.5rem] border border-red-50 shadow-sm overflow-hidden fade-in">
    <div className="p-8 border-b border-red-50/50 bg-red-50/30 flex items-center justify-between">
      <h2 className="text-2xl font-black text-red-950 flex items-center gap-3">
        <span className="material-symbols-outlined text-red-600 text-[28px]">rate_review</span>
        Review Moderation
      </h2>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr className="bg-red-50/50 border-b border-red-50">
            <th className="p-5 pl-8 text-[10px] font-black text-red-950/40 uppercase tracking-widest w-[250px]">Product</th>
            <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest w-[150px]">User &amp; Rating</th>
            <th className="p-5 text-[10px] font-black text-red-950/40 uppercase tracking-widest">Comment</th>
            <th className="p-5 pr-8 text-[10px] font-black text-red-950/40 uppercase tracking-widest text-right w-[100px]">Action</th>
          </tr>
        </thead>
        <tbody>
          {allReviews.map(review => (
            <tr key={review._id} className="hover:bg-red-50/20 transition-colors border-b border-red-50 group">
              <td className="p-5 pl-8 flex items-center gap-3">
                <Link to={`/product/${review.productId}`} className="flex items-center gap-3 group/product">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-red-50 shrink-0">
                    <img src={resolveImage(review.productImage)} alt={review.productTitle} className="w-full h-full object-cover mix-blend-multiply" />
                  </div>
                  <span className="font-bold text-sm text-red-950 hover:text-red-600 transition-colors line-clamp-2">
                    {review.productTitle}
                  </span>
                </Link>
              </td>
              <td className="p-5">
                <p className="font-bold text-red-950 text-sm flex items-center gap-1">
                  {review.name}
                  <span className="material-symbols-outlined text-red-600 text-[14px]" title="Verified Buyer">verified</span>
                </p>
                <div className="flex gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`material-symbols-outlined text-[14px] ${i < review.rating ? 'text-red-600 filled' : 'text-red-100'}`}>star</span>
                  ))}
                </div>
              </td>
              <td className="p-5">
                <p className="text-sm font-medium text-red-950/70 line-clamp-3">{review.comment}</p>
                <p className="text-[10px] text-red-950/40 font-bold mt-1 uppercase tracking-widest">
                  {new Date(review.createdAt).toLocaleDateString('en-IN')}
                </p>
              </td>
              <td className="p-5 pr-8 text-right">
                <button
                  onClick={() => setConfirmReviewDelete({ isOpen: true, productId: review.productId, reviewId: review._id })}
                  className="bg-red-50 text-red-500 hover:bg-red-600 hover:text-white p-2 rounded-xl transition-all shadow-sm flex items-center justify-center w-max ml-auto"
                  title="Delete Review"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </td>
            </tr>
          ))}
          {allReviews.length === 0 && (
            <tr>
              <td colSpan="4" className="text-center py-16">
                <span className="material-symbols-outlined text-[48px] text-red-200 mb-2 block">rate_review</span>
                <p className="text-red-950/50 font-bold">No reviews have been submitted yet.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default AdminModeration;
