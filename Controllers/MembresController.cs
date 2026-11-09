using System.ComponentModel.DataAnnotations;
using GestionTachesProjets.DTOs;
using GestionTachesProjets.Models;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace GestionTachesProjets.Controllers;
[ApiController]
[Route("api/[controller]")]
public class MembresController : ControllerBase
{
    private readonly IMembreRepository _repo ;
    public MembresController(IMembreRepository repo)
    {
        _repo=repo ;
    }

[HttpGet]
public async Task<ActionResult<PagedResult<MembreDto>>> GetAll(int page=1 ,int  pageSize=10)
    {
        if (page<1) page=1;
        if (pageSize<1 || pageSize>50 ) pageSize=10 ;
        var result= await _repo.GetAllAsync(page , pageSize);
        return Ok(new PagedResult<MembreDto>
        {
        Page = result.Page ,
        PageSize=result.PageSize,
        Total=result.Total,
        Items=result.Items.Select(ToDto).ToList()
        });
    }
[HttpGet("{id}")]
public async Task<ActionResult<MembreDto>> GetById(int id)
    {
        var membre = await _repo.GetByIdAsync(id);
        if (membre==null) return NotFound();
        return Ok(ToDto(membre));
    }
[HttpPost]
public async Task<ActionResult<MembreDto>> Create(MembreCreateDto dto)
{
        var membre= new Membre
          {
              Nom= dto.Nom,
              Email = dto.Email
          };
        await _repo.AddAsync(membre);
        return CreatedAtAction(nameof(GetById) , new {id=membre.Id} , ToDto(membre));
}
[HttpPut("{id}")]
public async Task<IActionResult>Update(int id ,MembreCreateDto dto)
    {
        var membre = await _repo.GetByIdAsync(id);
        if (membre==null) return NotFound();
        membre.Nom = dto.Nom;
        membre.Email = dto.Email ;
        await _repo.UpdateAsync(membre);
        return NoContent();
    }
[HttpDelete("{id}")]
public async Task<IActionResult> Delete (int id )
    {
        var membre = await _repo.GetByIdAsync(id);
        if (membre ==null) return NotFound();
        try
        {
            await _repo.DeleteAsync(membre);
        }
        catch (DbUpdateException)
        {
            return Conflict("ce membre a ecrit des commentaires on ne peut pas le supprimer");
        }
        return NoContent();
    }
private static MembreDto ToDto(Membre m)=> new MembreDto
     {
        Id = m.Id,
        Nom = m.Nom,
        Email = m.Email
};
}
